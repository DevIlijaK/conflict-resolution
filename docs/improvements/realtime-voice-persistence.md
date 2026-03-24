# Improvements — realtime voice persistence & product hardening

Forward-looking items moved here from the retired Phase 4 implementation guides and the former high-level realtime voice plan.

## Phase 5 — Hardening

Planned next phase for the overall realtime voice product:

- **Rate limits and cost awareness** per user / conflict.
- **Privacy copy** — make clear that sensitive details may be spoken aloud.
- **Logging** for session errors and tool failures.

## Out of scope for the initial persistence slice

These were explicitly deferred when designing the buffer-and-flush approach:

- **Live transcript in the UI during the call** — v1 buffers in memory and writes on completion, disconnect, or error flush; no streaming transcript panel tied to Convex during the session.
- **Surviving a tab crash mid-call** — in-memory buffer is lost; acceptable for an early version.
- **Deduplication / idempotency** — not built; assumes data-channel delivery is sufficient.
- **Optional `source` field** on `conflictMessages` — origin can be inferred from `responseStreamId` vs `responseText`; a dedicated field could be added later for filtering or badges (e.g. “Voice”).
- **Resuming the same OpenAI Realtime session after disconnect** — not pursued; new WebRTC session + Convex history is the intended model.

## Code map

The canonical list of file locations for this feature is in [`../realtime-voice-persistence-current.md`](../realtime-voice-persistence-current.md) under **Primary code locations**.
