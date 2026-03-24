"use client";

import { type StreamId } from "@convex-dev/persistent-text-streaming";
import { useStream } from "@convex-dev/persistent-text-streaming/react";
import { api } from "convex/_generated/api";
import { type Doc } from "convex/_generated/dataModel";
import { useMemo, useEffect } from "react";
import { env } from "../env";

export function ServerMessage({
  message,
  isDriven,
  stopStreaming,
  scrollToBottom,
}: {
  message: Doc<"conflictMessages">;
  isDriven: boolean;
  stopStreaming: () => void;
  scrollToBottom: () => void;
}) {
  const streamingUrl = useMemo(() => {
    const baseUrl = env.NEXT_PUBLIC_CONVEX_HTTP_URL;
    return new URL(`${baseUrl}/conflict-chat-stream`);
  }, []);

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
    scrollToBottom();
  }, [text, scrollToBottom]);

  return (
    <div className="text-sm leading-relaxed">
      {text ? (
        <p className="whitespace-pre-wrap">{text}</p>
      ) : (
        <p className="animate-pulse text-muted-foreground">Thinking…</p>
      )}
      {status === "error" && (
        <p className="mt-2 text-destructive">Error loading response</p>
      )}
    </div>
  );
}
