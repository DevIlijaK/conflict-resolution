# Phase 4 — Persistence & fallback UX (implementation guide)

Persisting voice transcripts to Convex and letting users **continue in text** after a voice session without losing context.

---

## Why this is tricky

1. **`conflictMessages` is built for text** — each row holds one user `prompt` and one `responseStreamId` (a persistent text stream). Voice has no stream; it produces transcript text on the client via data-channel events.

2. **Two transports, one timeline** — Text intake writes via Convex mutations + HTTP streaming. Voice runs browser ↔ OpenAI over WebRTC. Nothing automatically syncs the voice side back to Convex.

3. **Race condition on interview completion** — `completeVoiceInterview` schedules `applyGeneratedSummary`, which calls `getInterviewHistory` to build the summary. If voice transcript rows haven't been persisted to Convex yet, the summary is generated from incomplete data. **This is the hardest problem in Phase 4.**

---

## Core approach: evolve `conflictMessages`, don't add a second table

A second "turns" table creates a dual-source-of-truth problem — merge logic everywhere, two schemas to maintain, eventual migration to unify them. Instead, extend the existing table to also hold voice exchanges.

### Schema change

Make `responseStreamId` optional. Add two optional fields:

| New / changed field | Type | Purpose |
|---------------------|------|---------|
| `responseStreamId` | **optional** (was required) | Still used for text intake streams |
| `responseText` | `v.optional(v.string())` | Final assistant transcript text (voice rows) |
| `source` | `v.optional(v.union(v.literal("text"), v.literal("voice")))` | So queries/UI can distinguish origin |

Existing text-intake rows keep working unchanged (`responseStreamId` is present, `responseText` is absent). Voice rows have `responseText` filled and no `responseStreamId`.

**Ordering:** `_creationTime` already provides monotonic ordering — both voice and text mutations go through Convex, so no custom sequence counter is needed.

### Minimal downstream changes

- **`getInterviewHistory`** — when building the `{role, content}[]` array, check: if `responseStreamId` exists, read from the stream (existing path). If `responseText` exists, use it directly. One `if/else`, same output shape.

- **Chat UI** (`chat-window.tsx`) — when rendering a message row, if `responseStreamId` is present, render `<ServerMessage>` (existing). Otherwise render `responseText` as plain text in the same bubble style. Small conditional in one component.

- **`sendConflictMessage`** — unchanged, still creates text rows with streams.

---

## What to listen for on the data channel

You already have `transcription: { model: "whisper-1" }` configured in `realtime-session/route.ts`, so transcript events will fire. The key events (per OpenAI Realtime API):

| Event | What it means | Action |
|-------|---------------|--------|
| `conversation.item.input_audio_transcription.completed` | Final user speech-to-text for one utterance | Store `transcript` field in client buffer as the user's line |
| `response.audio_transcript.done` | Final assistant spoken-text for one response | Store `transcript` field as the assistant's line; pair with the preceding user line |

**Client-side buffering strategy:**

Maintain a small buffer in React state or a ref:

```typescript
type PendingExchange = {
  userTranscript: string | null;
  assistantTranscript: string | null;
};
```

- On user transcript completed → set `userTranscript`.
- On assistant transcript done → set `assistantTranscript`, then **flush**: call the Convex mutation with the pair, reset buffer.

This mirrors the existing `conflictMessages` shape: one row = one user prompt + one assistant response.

---

## Convex mutation

One new mutation, e.g. in `convex/voice.ts`:

**`appendVoiceExchange`**
- Args: `conflictId`, `userText`, `assistantText`.
- Handler: `mustGetCurrentUser` → verify conflict ownership → insert one `conflictMessages` row with `prompt: userText`, `responseText: assistantText`, `source: "voice"`, `type: "interview"`, no `responseStreamId`.

---

## Solving the race condition

The critical path today:

1. OpenAI calls `complete_intake_interview` tool → data channel event fires
2. `handleToolCall` in `voice-session.tsx` calls `completeInterview({ conflictId })` immediately
3. That mutation schedules `applyGeneratedSummary`
4. Summary job calls `getInterviewHistory` — **but voice turns may not be persisted yet**

**Fix: flush before completing.**

The tool call handler should:

1. **Flush all buffered transcript exchanges** to Convex (call `appendVoiceExchange` for each pending pair, await all).
2. **Then** call `completeInterview`.

```typescript
// pseudocode in handleToolCall
await flushAllPendingTranscripts();   // writes voice turns to Convex
await completeInterview({ conflictId }); // now safe — history is complete
```

This guarantees `getInterviewHistory` sees the full voice conversation when the summary job runs.

---

## Disconnect, reconnect, and "continue in text"

**Mental model:** each voice call is an ephemeral session. Convex is the permanent record. There is no "resume" of an OpenAI Realtime session.

1. **On disconnect** (intentional or dropped) — clean up WebRTC, flush any buffered transcript to Convex, set UI to idle. Show a prompt like "You can keep going by typing below."

2. **Continue in text** — `sendConflictMessage` works as before. `getInterviewHistory` now includes voice rows (via the `responseText` path), so the text model sees what was said on the call and picks up naturally.

3. **Start voice again** — New WebRTC + SDP. `getVoiceSessionConfig` already injects prior `conflictMessages` history into instructions (see `convex/voice.ts` lines 49-76). Since voice rows are now in the same table, they're automatically included — no extra work.

---

## UI: showing voice turns in the transcript

`ConflictChatWindow` and `ConflictChatTranscript` both iterate `conflictMessages` rows. Each row renders:
- User bubble: `message.prompt` (works for voice — it holds `userTranscript`)
- Assistant bubble: `<ServerMessage>` component reading from the stream

For voice rows (no `responseStreamId`), render `message.responseText` as plain text instead. One conditional branch per message:

```tsx
{message.responseStreamId ? (
  <ServerMessage message={message} ... />
) : (
  <p>{message.responseText}</p>
)}
```

Optionally add a small "Voice" badge based on `message.source === "voice"`.

---

## Done criteria

| Criterion | How you know it's done |
|-----------|------------------------|
| Transcript reflects voice | After a voice session, the conflict chat page shows spoken exchanges as text bubbles. |
| Text mode still works | `sendConflictMessage` + streams unchanged; no regression. |
| Continue after disconnect | Close voice → type a message → assistant context includes what was said on the call. |
| Summary is complete | `completeVoiceInterview` → summary includes voice content (flush-before-complete works). |

---

## Implementation order

1. **Schema** — make `responseStreamId` optional, add `responseText` and `source` to `conflictMessages`.
2. **Mutation** — `appendVoiceExchange` in `convex/voice.ts`.
3. **Client transcript handling** — add event listeners in `voice-session.tsx` for transcript events; buffer pairs; flush to Convex.
4. **Fix the race** — `handleToolCall` flushes transcripts before calling `completeInterview`.
5. **`getInterviewHistory`** — add the `responseText` fallback path (small `if/else`).
6. **Chat UI** — conditional rendering for voice rows in `chat-window.tsx`.
7. **Manual test** — voice session → end → see transcript → type a follow-up → confirm model references voice content → complete interview → verify summary includes voice.

---

## References

| What | Where |
|------|-------|
| Voice client + event handling | `src/components/voice-session.tsx` |
| Session config + transcription setup | `src/app/api/realtime-session/route.ts` |
| Voice session config + history injection | `convex/voice.ts` |
| Text messages + streaming | `convex/messages.ts` |
| Schema | `convex/schema.ts` (`conflictMessages`) |
| Chat UI | `src/components/chat-window.tsx` |
