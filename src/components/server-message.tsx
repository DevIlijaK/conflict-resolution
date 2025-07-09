import { type StreamId } from "@convex-dev/persistent-text-streaming";
import { useStream } from "@convex-dev/persistent-text-streaming/react";
import { api } from "convex/_generated/api";
import { type Doc } from "convex/_generated/dataModel";
import { useMemo, useEffect } from "react";
import Markdown from "react-markdown";
import { env } from "../env";

export function ServerMessage({
  message,
  isDriven,
  stopStreaming,
  scrollToBottom,
  isConflictMessage = false,
}: {
  message: Doc<"userMessages">;
  isDriven: boolean;
  stopStreaming: () => void;
  scrollToBottom: () => void;
  isConflictMessage?: boolean;
}) {
  // Choose the appropriate streaming endpoint
  const streamingUrl = useMemo(() => {
    const baseUrl = env.NEXT_PUBLIC_CONVEX_HTTP_URL;
    if (isConflictMessage) {
      return new URL(`${baseUrl}/conflict-chat-stream`);
    }
    return new URL(`${baseUrl}/chat-stream`);
  }, [isConflictMessage]);

  const { text, status } = useStream(
    api.streaming.getStreamBody,
    streamingUrl,
    isDriven,
    message.responseStreamId as StreamId,
  );

  const isCurrentlyStreaming = useMemo(() => {
    if (!isDriven) return false;
    return status === "pending" || status === "streaming";
  }, [isDriven, status]);

  useEffect(() => {
    if (!isDriven) return;
    if (isCurrentlyStreaming) return;
    stopStreaming();
  }, [isDriven, isCurrentlyStreaming, stopStreaming]);

  useEffect(() => {
    if (!text) return;
    console.log("text", text);
    scrollToBottom();
  }, [text, scrollToBottom]);

  return (
    <div className="md-answer">
      <Markdown>{text || "Thinking..."}</Markdown>
      {status === "error" && (
        <div className="mt-2 text-red-500">Error loading response</div>
      )}
    </div>
  );
}
