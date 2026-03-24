# Realtime voice — persistence & fallback (current implementation)

This document describes how **voice transcript persistence** and **shared history with text intake** work in the codebase today. It replaces the removed step-by-step implementation guides.

## Architecture

- **Live audio:** Browser ↔ OpenAI over WebRTC. SDP exchange goes through `POST /api/realtime-session`, which loads instructions and tools from Convex (`getVoiceSessionConfig`) and enables input transcription (`whisper-1`) in the session payload.
- **Permanent record:** Voice exchanges are written to the same `conflictMessages` table as text interview messages. Text rows use a persistent text stream (`responseStreamId`); voice rows store the assistant reply in `responseText` and omit `responseStreamId`.

## Schema (`convex/schema.ts`)

`conflictMessages` includes:

- `responseStreamId` — optional; present for text-stream messages.
- `responseText` — optional; used for voice-persisted assistant lines.

## Convex

### `saveVoiceTranscript` (`convex/voice.ts`)

Public mutation: `conflictId` + `exchanges: { userText, assistantText }[]`. Authenticates the user, checks conflict ownership, then inserts one document per exchange with `prompt`, `responseText`, `type: "interview"`, and no `responseStreamId`.

### `getVoiceSessionConfig` (`convex/voice.ts`)

Loads prior messages for the conflict. For each row, assistant content comes from the stream when `responseStreamId` is set, otherwise from `responseText`. That history is appended to the system instructions so a new voice session can continue after text or earlier voice.

### `getInterviewHistory` (`convex/messages.ts`)

Uses the same branch: stream body vs `responseText`. Summaries and text chat therefore see voice turns once they are saved.

### `completeVoiceInterview` (`convex/voice.ts`)

Marks the conflict in progress and schedules `applyGeneratedSummary`. The client is responsible for calling `saveVoiceTranscript` **before** this mutation when the completion tool runs, so the summary job reads a full history.

## Client (`src/components/voice-session.tsx`)

- **Buffering:** `transcriptBufferRef` holds `{ userText, assistantText }` pairs. `pendingUserTextRef` holds the latest user line until the assistant transcript completes.
- **Events:** On `conversation.item.input_audio_transcription.completed`, the client stores `transcript` in `pendingUserTextRef`. On `response.output_audio_transcript.done`, it pairs with the pending user text (or empty string) and appends to the buffer.
- **Completion tool:** When `response.function_call_arguments.done` fires for the intake completion tool, the handler optionally pairs `pendingUserTextRef` with the tool’s `completion_message`, then flushes the full buffer via `saveVoiceTranscript`, then calls `completeVoiceInterview`.
- **Disconnect / error:** `disconnect` and the connection error path call `flushBuffer`, which persists any buffered rows (and pushes a dangling pending user line with empty assistant text). Failures on flush are logged; the buffer is still cleared after a successful save attempt.

## Chat UI (`src/components/chat-window.tsx`)

Assistant content uses `<ServerMessage>` when `responseStreamId` is set; otherwise it renders `responseText` as plain text in the same layout. There is no separate `source` field on documents; voice vs text is implied by which response field is present.

## Session setup (`src/app/api/realtime-session/route.ts`)

After Clerk auth and Convex `getVoiceSessionConfig`, the handler posts to OpenAI Realtime with `audio.input.transcription` so user audio is transcribed for the events above.

## Primary code locations

| Area | Location |
|------|-----------|
| Voice client + buffering / flush | `src/components/voice-session.tsx` |
| SDP + transcription session config | `src/app/api/realtime-session/route.ts` |
| Voice config, save mutation, completion | `convex/voice.ts` |
| History for summaries / text model | `convex/messages.ts` (`getInterviewHistory`) |
| Table shape | `convex/schema.ts` (`conflictMessages`) |
| Chat rendering | `src/components/chat-window.tsx` |
