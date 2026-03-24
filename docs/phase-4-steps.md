# Phase 4 — Step-by-step implementation

Seven steps. Each one is a small, isolated change. No new tables, no counters, no dedup infrastructure.

**Core idea:** buffer voice transcript pairs in memory on the client. Write them all to Convex in one mutation before the interview completes or the session disconnects. Reuse the existing `conflictMessages` table with two optional fields.

---

## Step 1 — Schema: let `conflictMessages` hold voice rows

**File:** `convex/schema.ts`

Two changes to the `conflictMessages` table definition:

1. Make `responseStreamId` optional — voice rows won't have a stream.
2. Add `responseText: v.optional(v.string())` — voice rows store the assistant's transcript here instead.

That's it. No new table, no new indexes, no `source` field (voice vs text is determined by which response field is present).

**Why this works:** every downstream reader (`getInterviewHistory`, `getVoiceSessionConfig`, chat UI) already queries `conflictMessages` by `conflictId`. Voice rows appear automatically in the same queries — they just need a one-line guard to read `responseText` instead of calling into the streaming component.

**Existing text rows are unaffected** — they still have `responseStreamId` set. Nothing changes for the text intake path.

---

## Step 2 — Mutation: `saveVoiceTranscript`

**File:** `convex/voice.ts`

New public mutation that writes an array of voice exchanges in one call:

- **Args:** `conflictId: v.id("conflicts")`, `exchanges: v.array(v.object({ userText: v.string(), assistantText: v.string() }))`.
- **Auth:** `mustGetCurrentUser`, verify `conflict.createdBy === user._id`.
- **Handler:** loop over `exchanges`, insert one `conflictMessages` row per entry: `{ conflictId, prompt: exchange.userText, responseText: exchange.assistantText, userId: user._id, type: "interview" }`. No `responseStreamId`.
- **Returns:** `v.null()`.

One mutation, multiple inserts, all in one transaction. If it fails, nothing is written (clean rollback). If it succeeds, everything is persisted before the next step runs.

---

## Step 3 — Client: buffer transcript events

**File:** `src/components/voice-session.tsx`

Add a ref to accumulate transcript pairs during the voice session:

```typescript
const transcriptBufferRef = useRef<
  Array<{ userText: string; assistantText: string }>
>([]);
const pendingUserTextRef = useRef<string | null>(null);
```

In the existing `dc.addEventListener("message", ...)` handler (the one that already checks `isFunctionCallDone`), add two more event type checks:

1. **`conversation.item.input_audio_transcription.completed`** — user finished speaking. Store the transcript:
   ```
   pendingUserTextRef.current = event.transcript;
   ```

2. **`response.audio_transcript.done`** — assistant finished speaking. Pair with the pending user line and push to the buffer:
   ```
   transcriptBufferRef.current.push({
     userText: pendingUserTextRef.current ?? "",
     assistantText: event.transcript,
   });
   pendingUserTextRef.current = null;
   ```

No mutations are called during the conversation. The buffer just grows in memory. This keeps the voice session free of network calls and latency during the actual conversation.

**Note on event names:** these are the current OpenAI Realtime API event types for the model/config we use (`gpt-realtime-1.5` with `input.transcription.model: "whisper-1"`). If they don't fire, check the data channel event log (already visible in the UI debug panel) and adjust the type strings.

---

## Step 4 — Flush before completing the interview (race condition fix)

**File:** `src/components/voice-session.tsx`

This is the critical ordering fix. Today `handleToolCall` calls `completeInterview()` immediately, which schedules `applyGeneratedSummary`. That summary job calls `getInterviewHistory` — but if voice exchanges aren't in Convex yet, the summary is generated from empty/incomplete data.

**Fix:** in `handleToolCall`, before `completeInterview`:

1. If `pendingUserTextRef.current` is set (the user utterance that triggered the tool call — the model chose to call a tool instead of speaking back), push it to the buffer with the tool's `completion_message` as the assistant text:
   ```
   const toolArgs = JSON.parse(event.arguments);
   if (pendingUserTextRef.current) {
     transcriptBufferRef.current.push({
       userText: pendingUserTextRef.current,
       assistantText: toolArgs.completion_message ?? "",
     });
     pendingUserTextRef.current = null;
   }
   ```

2. Call `saveVoiceTranscript` with the full buffer and await it.

3. *Then* call `completeInterview`.

The summary job now sees all voice exchanges because they're in `conflictMessages` before `applyGeneratedSummary` is scheduled.

---

## Step 5 — Flush on disconnect

**File:** `src/components/voice-session.tsx`

In the `disconnect` callback (and in the error/cleanup path), flush whatever's in the buffer before resetting state. This handles two cases:

- **User clicks "End"** mid-conversation (no tool call, no completion).
- **Connection drops** unexpectedly.

```
if (transcriptBufferRef.current.length > 0) {
  await saveVoiceTranscript({ conflictId, exchanges: transcriptBufferRef.current });
  transcriptBufferRef.current = [];
}
```

If the flush fails (e.g. network is gone), the transcript is lost for that session. Acceptable for v1 — the user can re-do the voice call. Phase 5 can add local persistence or retry logic if needed.

**Note:** `disconnect` is currently synchronous. It will need to become async and await the mutation. The `onClick` handler on the "End" button can call `void disconnect()` since we don't need to block the UI.

---

## Step 6 — Backend: guard the two places that read `responseStreamId`

Two files need the same small change: "if this row has a stream, read the stream; otherwise use `responseText`."

### 6a. `convex/messages.ts` — `getInterviewHistory`

Current code (lines 99-108) does `streamingComponent.getStreamBody(ctx, msg.responseStreamId as StreamId)` on every message. Add a guard:

```typescript
const assistantContent = userMessage.responseStreamId
  ? (await streamingComponent.getStreamBody(ctx, userMessage.responseStreamId as StreamId)).text
  : (userMessage.responseText ?? "");
```

Use `assistantContent` where `joined.responseMessage.text` is used today. The return shape (`{role, content}[]`) stays identical.

### 6b. `convex/voice.ts` — `getVoiceSessionConfig`

Same pattern in the `allMessages.map` block (lines 55-63):

```typescript
const response = msg.responseStreamId
  ? (await streamingComponent.getStreamBody(ctx, msg.responseStreamId as StreamId)).text
  : (msg.responseText ?? "");
return { prompt: msg.prompt, response };
```

Both changes are one `if/else` expression. Output shape unchanged. Everything downstream (summary generation, voice instructions) works without modification.

---

## Step 7 — Chat UI: render voice rows as plain text

**File:** `src/components/chat-window.tsx`

Both `ConflictChatTranscript` and `ConflictChatWindow` render the assistant side of every message with `<ServerMessage>`. That component reads from the persistent text stream — it will break on voice rows that have no `responseStreamId`.

Add a conditional in both components. Where you currently have:

```tsx
<ServerMessage message={message} isDriven={...} ... />
```

Replace with:

```tsx
{message.responseStreamId ? (
  <ServerMessage message={message} isDriven={...} ... />
) : (
  <span>{message.responseText}</span>
)}
```

Style the `<span>` with the same classes `ServerMessage` output uses (or wrap in the same `MessageItem` container — it already handles the bubble styling).

User-side rendering (`message.prompt`) works identically for both voice and text — no change needed.

---

## Verification

After all seven steps, test this sequence:

1. Start a voice session on a conflict.
2. Have a conversation (a few exchanges).
3. Let the model call the completion tool — verify the transcript appears on the conflict page.
4. Check the generated summary — it should reference things said during the voice call.
5. Go back to the conflict page and type a text message — verify the text model's response references voice content (it sees the history via `getInterviewHistory`).
6. Start a new voice session on the same conflict — verify the model picks up where you left off (it sees history via `getVoiceSessionConfig`).
7. Mid-conversation, click "End" — verify partial transcript is saved and visible.

---

## What's NOT in scope

- Real-time transcript visibility during the call (v1 buffers in memory, writes at end).
- Surviving a tab crash mid-call (transcript in memory is lost — acceptable).
- Deduplication / idempotency (data channel is reliable; not a real problem).
- `source` field on schema (derivable from `responseStreamId` presence — add later if needed for filtering/badges).
- Resume an existing OpenAI Realtime session after disconnect (not worth pursuing; new session + Convex history is the model).
