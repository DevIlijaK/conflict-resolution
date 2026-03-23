"use client";

import dynamic from "next/dynamic";
import { useQuery, useMutation } from "convex/react";
import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  type FC,
  type PropsWithChildren,
  type KeyboardEvent,
} from "react";
import MessageItem from "./message-item";
import { api } from "convex/_generated/api";
import { useWindowSize } from "~/lib/utils";
import { Button } from "./ui/button";
import { Send } from "lucide-react";
import { cx } from "class-variance-authority";
import { type Id } from "convex/_generated/dataModel";

const ServerMessage = dynamic(
  () =>
    import("./server-message").then((mod) => ({ default: mod.ServerMessage })),
  { ssr: false },
);

const noop = () => {
  void 0;
};

function scrollEndIntoView(
  el: HTMLElement | null,
  behavior: ScrollBehavior = "smooth",
) {
  if (!el) return;
  window.setTimeout(() => {
    if (el.isConnected) el.scrollIntoView({ behavior });
  }, 1000);
}

export function ConflictChatTranscript({
  conflictId,
}: {
  conflictId: Id<"conflicts">;
}) {
  const messages = useQuery(api.messages.listConflictMessages, {
    conflictId,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    scrollEndIntoView(messagesEndRef.current, behavior);
  }, []);

  const windowSize = useWindowSize();

  useEffect(() => {
    scrollToBottom();
  }, [windowSize, messages, scrollToBottom]);

  if (!messages) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 md:px-4">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          {messages.length === 0 && (
            <div className="space-y-2 text-center text-gray-500">
              <p>There are no intake messages for this conflict yet.</p>
              <p className="text-sm">
                After you chat with the assistant, the conversation will appear
                here.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <React.Fragment key={message._id}>
              <MessageItem message={message} isUser={true}>
                {message.prompt}
              </MessageItem>
              <MessageItem message={message} isUser={false}>
                <ServerMessage
                  message={message}
                  isDriven={false}
                  stopStreaming={noop}
                  scrollToBottom={scrollToBottom}
                />
              </MessageItem>
            </React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}

export function ConflictChatWindow({
  conflictId,
}: {
  conflictId: Id<"conflicts">;
}) {
  const [drivenIds, setDrivenIds] = useState<Set<string>>(new Set());
  const [isStreaming, setIsStreaming] = useState(false);
  const messages = useQuery(api.messages.listConflictMessages, {
    conflictId,
  });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sendMessage = useMutation(api.messages.sendConflictMessage);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    scrollEndIntoView(messagesEndRef.current, behavior);
  }, []);

  const windowSize = useWindowSize();

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    setInput("");

    const chatId = await sendMessage({
      conflictId,
      prompt: input,
    });

    setDrivenIds((prev) => {
      prev.add(chatId);
      return prev;
    });

    setIsStreaming(true);
  }, [input, sendMessage, conflictId]);

  useEffect(() => {
    scrollToBottom();
  }, [windowSize, messages, scrollToBottom]);

  if (!messages) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isStreaming) {
        void handleSend();
      }
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div
        ref={messageContainerRef}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-4 md:px-4"
      >
        <div className="mx-auto w-full max-w-2xl space-y-6">
          {messages.length === 0 && (
            <div className="space-y-2 text-center text-gray-500">
              <p>
                The assistant will ask questions to learn what happened—who was
                involved, what was said or done, and in what order.
              </p>
              <p>
                Start with a few sentences in your own words; it will follow up
                one question at a time.
              </p>
            </div>
          )}
          {messages.map((message) => (
            <React.Fragment key={message._id}>
              <MessageItem message={message} isUser={true}>
                {message.prompt}
              </MessageItem>
              <MessageItem message={message} isUser={false}>
                <ServerMessage
                  message={message}
                  isDriven={drivenIds.has(message._id)}
                  stopStreaming={() => {
                    setIsStreaming(false);
                    focusInput();
                  }}
                  scrollToBottom={scrollToBottom}
                />
              </MessageItem>
            </React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInputContainer
        className="mt-2"
        onClickSend={handleSend}
        isReady={input.length > 0 && !isStreaming}
      >
        <textarea
          ref={inputRef}
          rows={3}
          className="field-sizing-content max-h-36 min-h-[4.5rem] grow resize-none overflow-y-auto border-none px-2 text-sm outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what happened. The assistant will ask follow-ups."
        />
      </ChatInputContainer>
    </div>
  );
}

const ChatInputContainer: FC<
  PropsWithChildren<{
    onClickSend?: () => void;
    className?: string;
    isReady?: boolean;
  }>
> = ({ children, onClickSend, className, isReady }) => {
  return (
    <div
      className={cx(
        "bg-background flex w-full flex-col gap-2 rounded-2xl border p-3 shadow-sm",
        className,
      )}
    >
      <div className="flex items-end gap-2">
        {children}
        <Button
          type="button"
          size="icon"
          className="text-primary-foreground hover:bg-primary/90 shrink-0"
          onClick={onClickSend}
          disabled={!isReady}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
