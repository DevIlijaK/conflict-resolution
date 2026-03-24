# Realtime voice (OpenAI) + Convex + Next.js

## Where to read docs & find examples

**Convex first (expect gaps — no first-party voice transport)**

- [Convex docs — HTTP actions](https://docs.convex.dev/functions/http-actions) — optional: mint session-related payloads, webhooks; not where WebRTC lives.
- [Convex docs — Actions](https://docs.convex.dev/functions/actions) — call external APIs from Node; useful for **non-WebRTC** helpers (e.g. post-session cleanup), not the live audio socket.
- [Convex docs — File storage](https://docs.convex.dev/file-storage) — if you ever store short audio clips or exports.
- [Convex Components directory](https://www.convex.dev/components) — search `voice`, `elevenlabs`, `audio`; usually **TTS/STT/file workflows**, not OpenAI Realtime WebRTC.
- [Convex Discord](https://www.convex.dev/community) / forum — search *realtime*, *webrtc*, *openai voice*.
- GitHub: `convex` + `openai` + `realtime` or `webrtc` — mostly **community fragments**, not an official template.

**Next.js + OpenAI (where the realtime examples actually are)**

- [OpenAI — Realtime API](https://platform.openai.com/docs/guides/realtime)
- [OpenAI — Realtime with WebRTC](https://platform.openai.com/docs/guides/realtime-webrtc) — browser mic/speaker path; server holds API key for session setup.
- [openai/openai-realtime-console](https://github.com/openai/openai-realtime-console) — reference UI and event wiring.
- [openai/openai-realtime-api-beta](https://github.com/openai/openai-realtime-api-beta) — older client reference; verify event names against current docs.
- [OpenAI Agents SDK (JS) — Voice agents quickstart](https://openai.github.io/openai-agents-js/guides/voice-agents/quickstart/)
- GitHub search: `openai realtime webrtc nextjs`, `realtime calls sdp`

**How pieces split**

- **Live audio session:** browser ↔ OpenAI (WebRTC or WS per docs), with **Next.js Route Handler** (or small Node service) for **SDP / ephemeral session** — **not** Convex.
- **Product data:** Convex — user, conflict, transcripts, tool side effects.

---

## Implementation plan

### Phase 1 — Spike: connect and hear the model

- Follow OpenAI Realtime + WebRTC guides; implement one **Next.js `POST`** route: SDP in → SDP out using server-side API key.
- Client: `getUserMedia` → `RTCPeerConnection` → your route → play remote audio.
- **Done when:** two-way voice works **without** Convex.

### Phase 2 — Auth and scoping

- Require login before starting a session; attach `conflictId` / user id in session metadata or your own state.
- **Done when:** anonymous users cannot mint sessions; each session is tied to your app context.

### Phase 3 — Same intent as text intake (tools + Convex)

- Register **function tools** on the Realtime session (mirror what text intake needs: context load, structured updates, completion).
- On tool call from OpenAI, a **trusted server path** (Next route or server action) invokes **Convex** (HTTP client, authenticated mutation pattern you already use).
- **Done when:** voice path reads/writes the same domain data as the text chat.

### Phase 4 — Persistence & fallback UX

- Listen for **transcript** events (user + assistant); **append** to Convex (`conflictMessages` or a dedicated turns table).
- Handle disconnect/reconnect and **continue in text** without losing thread.
- **Done when:** transcript view reflects voice sessions; text mode still works.

### Phase 5 — Hardening

- Rate limits and cost awareness per user/conflict.
- Clear **privacy** copy (sensitive details spoken aloud).
- Logging for session errors and tool failures.

---

## Summary

| Layer        | Role                                      |
|-------------|--------------------------------------------|
| OpenAI RT   | Realtime audio + model                     |
| Next.js     | Session setup, tool gateway to Convex      |
| Convex      | Auth-linked data, history, side effects    |

There is **no** “Convex-only” realtime voice example; **Next (or Node) + OpenAI docs/repos** are the source of truth for the audio leg, with Convex alongside for data.
