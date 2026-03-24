"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { type Id } from "convex/_generated/dataModel";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";

type ConnectionState = "idle" | "connecting" | "connected" | "error";

interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

interface FunctionCallDoneEvent extends RealtimeEvent {
  type: "response.function_call_arguments.done";
  call_id: string;
  name: string;
  arguments: string;
}

interface VoiceSessionProps {
  conflictId: Id<"conflicts">;
}

function isFunctionCallDone(evt: RealtimeEvent): evt is FunctionCallDoneEvent {
  return (
    evt.type === "response.function_call_arguments.done" &&
    typeof evt.call_id === "string" &&
    typeof evt.name === "string" &&
    typeof evt.arguments === "string"
  );
}

export function VoiceSession({ conflictId }: VoiceSessionProps) {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [interviewCompleted, setInterviewCompleted] = useState(false);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const transcriptBufferRef = useRef<
    Array<{ userText: string; assistantText: string }>
  >([]);
  const pendingUserTextRef = useRef<string | null>(null);

  const completeInterview = useMutation(api.voice.completeVoiceInterview);
  const saveVoiceTranscript = useMutation(api.voice.saveVoiceTranscript);

  const addEvent = useCallback((event: RealtimeEvent) => {
    setEvents((prev) => [...prev.slice(-49), event]);
  }, []);

  const sendDataChannelEvent = useCallback(
    (payload: Record<string, unknown>) => {
      const dc = dcRef.current;
      if (dc && dc.readyState === "open") {
        dc.send(JSON.stringify(payload));
      }
    },
    [],
  );

  const handleToolCall = useCallback(
    async (event: FunctionCallDoneEvent) => {
      addEvent({
        type: "system.tool_call",
        message: `Executing tool: ${event.name}`,
      });

      try {
        const toolArgs = JSON.parse(event.arguments) as {
          completion_message?: string;
        };

        if (pendingUserTextRef.current) {
          transcriptBufferRef.current.push({
            userText: pendingUserTextRef.current,
            assistantText: toolArgs.completion_message ?? "",
          });
          pendingUserTextRef.current = null;
        }

        if (transcriptBufferRef.current.length > 0) {
          await saveVoiceTranscript({
            conflictId,
            exchanges: transcriptBufferRef.current,
          });
          transcriptBufferRef.current = [];
        }

        await completeInterview({ conflictId });

        sendDataChannelEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: event.call_id,
            output: JSON.stringify({
              status: "completed",
              message:
                "Interview has been recorded and a summary is being generated.",
            }),
          },
        });

        sendDataChannelEvent({ type: "response.create" });
        setInterviewCompleted(true);

        addEvent({
          type: "system.tool_result",
          message: "Interview completed successfully",
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Tool execution failed";

        sendDataChannelEvent({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: event.call_id,
            output: JSON.stringify({ status: "error", message: errorMessage }),
          },
        });

        sendDataChannelEvent({ type: "response.create" });

        addEvent({
          type: "system.tool_error",
          message: errorMessage,
        });
      }
    },
    [
      addEvent,
      completeInterview,
      conflictId,
      saveVoiceTranscript,
      sendDataChannelEvent,
    ],
  );

  const handleToolCallRef = useRef(handleToolCall);
  handleToolCallRef.current = handleToolCall;

  const cleanup = useCallback(() => {
    dcRef.current?.close();
    dcRef.current = null;

    pcRef.current?.close();
    pcRef.current = null;

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
  }, []);

  const flushBuffer = useCallback(async () => {
    if (pendingUserTextRef.current) {
      transcriptBufferRef.current.push({
        userText: pendingUserTextRef.current,
        assistantText: "",
      });
      pendingUserTextRef.current = null;
    }
    if (transcriptBufferRef.current.length > 0) {
      try {
        await saveVoiceTranscript({
          conflictId,
          exchanges: transcriptBufferRef.current,
        });
      } catch (err) {
        console.error("Failed to flush transcript buffer:", err);
      }
      transcriptBufferRef.current = [];
    }
  }, [conflictId, saveVoiceTranscript]);

  const connect = useCallback(async () => {
    setConnectionState("connecting");
    setEvents([]);
    setInterviewCompleted(false);

    try {
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audio = document.createElement("audio");
      audio.autoplay = true;
      audioRef.current = audio;
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0] ?? null;
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const track = stream.getTracks()[0];
      if (track) pc.addTrack(track, stream);

      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.addEventListener("open", () => {
        addEvent({ type: "system", message: "Data channel open" });
        dc.send(JSON.stringify({ type: "response.create" }));
      });

      dc.addEventListener("message", (e: MessageEvent<string>) => {
        try {
          const event = JSON.parse(e.data) as RealtimeEvent;
          addEvent(event);

          if (isFunctionCallDone(event)) {
            void handleToolCallRef.current(event);
          }

          if (
            event.type ===
            "conversation.item.input_audio_transcription.completed"
          ) {
            console.log("[voice] user transcript:", event.transcript);
            pendingUserTextRef.current = event.transcript as string;
          }

          if (event.type === "response.audio_transcript.done") {
            console.log("[voice] assistant transcript:", event.transcript);
            console.log(
              "[voice] pairing → user:",
              pendingUserTextRef.current,
              "| assistant:",
              event.transcript,
            );
            transcriptBufferRef.current.push({
              userText: pendingUserTextRef.current ?? "",
              assistantText: event.transcript as string,
            });
            pendingUserTextRef.current = null;
          }
        } catch {
          addEvent({ type: "system.raw", data: e.data });
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch("/api/realtime-session", {
        method: "POST",
        body: offer.sdp,
        headers: {
          "Content-Type": "application/sdp",
          "x-conflict-id": conflictId,
        },
      });

      if (!sdpResponse.ok) {
        throw new Error(
          `Session creation failed: ${sdpResponse.status} ${await sdpResponse.text()}`,
        );
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setConnectionState("connected");
    } catch (err) {
      console.error("Voice connection error:", err);
      setConnectionState("error");
      addEvent({
        type: "system.error",
        message: err instanceof Error ? err.message : "Connection failed",
      });
      await flushBuffer();
      cleanup();
    }
  }, [addEvent, conflictId, cleanup, flushBuffer]);

  const disconnect = useCallback(async () => {
    await flushBuffer();
    cleanup();
    setConnectionState("idle");
    setIsMuted(false);
  }, [cleanup, flushBuffer]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  const isActive =
    connectionState === "connecting" || connectionState === "connected";

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Voice Session
          <span className="text-muted-foreground text-sm font-normal">
            {connectionState === "idle" && "Ready"}
            {connectionState === "connecting" && "Connecting..."}
            {connectionState === "connected" &&
              (interviewCompleted ? "Interview complete" : "Connected")}
            {connectionState === "error" && "Error — try again"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {!isActive ? (
            <Button onClick={connect} className="gap-2">
              <Phone className="h-4 w-4" />
              Start Voice
            </Button>
          ) : (
            <>
              <Button
                onClick={() => void disconnect()}
                variant="destructive"
                className="gap-2"
              >
                <PhoneOff className="h-4 w-4" />
                End
              </Button>
              <Button
                onClick={toggleMute}
                variant={isMuted ? "secondary" : "outline"}
                size="icon"
              >
                {isMuted ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>

        {events.length > 0 && (
          <div className="bg-muted max-h-64 overflow-y-auto rounded-md p-3 font-mono text-xs">
            {events.map((evt, i) => (
              <div key={i} className="text-muted-foreground py-0.5">
                <span className="text-foreground font-semibold">
                  {evt.type}
                </span>
                {"message" in evt && (
                  <span className="ml-2">{String(evt.message)}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
