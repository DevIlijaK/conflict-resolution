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
import { cn, useWindowSize } from "~/lib/utils";
import { Button } from "./ui/button";
import { Bot, Send } from "lucide-react";
import { type Id } from "convex/_generated/dataModel";

const INTRO_MESSAGE =
  "Hi, I'm here to help document what happened. My role is to gather the facts\u2009—\u2009who was involved, what was said or done, and in what order. Start by telling me in a few sentences what the situation is about, and I'll follow up with questions one at a time.";

function IntroMessage() {
  return (
    <div className="flex gap-3 justify-start">
      <div className="flex max-w-[90%] gap-2.5 md:max-w-[80%]">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
          aria-hidden="true"
        >
          <Bot className="h-3 w-3" />
        </div>
        <div className="rounded-2xl px-3 py-2 text-sm leading-relaxed bg-muted text-foreground">
          <p className="whitespace-pre-wrap">{INTRO_MESSAGE}</p>
        </div>
      </div>
    </div>
  );
}

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
    <div className="bg-background flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-4 md:px-4">
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <IntroMessage />
          {messages.map((message) => (
            <React.Fragment key={message._id}>
              {message.prompt ? (
                <MessageItem message={message} isUser={true}>
                  {message.prompt}
                </MessageItem>
              ) : null}
              <MessageItem message={message} isUser={false}>
                {message.responseStreamId ? (
                  <ServerMessage
                    message={message}
                    isDriven={false}
                    stopStreaming={noop}
                    scrollToBottom={scrollToBottom}
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{message.responseText}</p>
                )}
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
    <div className="bg-background flex min-h-0 flex-1 flex-col">
      <div
        ref={messageContainerRef}
        className="min-h-0 flex-1 overflow-y-auto px-2 py-4 md:px-4"
      >
        <div className="mx-auto w-full max-w-2xl space-y-6">
          <IntroMessage />
          {messages.map((message) => (
            <React.Fragment key={message._id}>
              {message.prompt ? (
                <MessageItem message={message} isUser={true}>
                  {message.prompt}
                </MessageItem>
              ) : null}
              <MessageItem message={message} isUser={false}>
                {message.responseStreamId ? (
                  <ServerMessage
                    message={message}
                    isDriven={drivenIds.has(message._id)}
                    stopStreaming={() => {
                      setIsStreaming(false);
                      focusInput();
                    }}
                    scrollToBottom={scrollToBottom}
                  />
                ) : (
                  <p className="whitespace-pre-wrap">{message.responseText}</p>
                )}
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
          className="placeholder:text-muted-foreground field-sizing-content max-h-36 min-h-[4.5rem] grow resize-none overflow-y-auto border-none bg-transparent px-2 text-sm focus-visible:outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what happened from your perspective. The assistant will ask follow-ups."
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
      className={cn(
        "bg-background focus-within:ring-ring flex w-full flex-col gap-2 rounded-xl border p-3 shadow-sm transition-shadow focus-within:ring-2",
        className,
      )}
    >
      <div className="flex items-end gap-2">
        {children}
        <Button
          type="button"
          size="icon"
          className="shrink-0"
          onClick={onClickSend}
          disabled={!isReady}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
