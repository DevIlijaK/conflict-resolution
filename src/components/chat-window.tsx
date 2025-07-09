"use client";

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
import dynamic from "next/dynamic";
import { useWindowSize } from "~/lib/utils";
import { Button } from "./ui/button";
import { Mic, Paperclip, Send, Sparkles, CheckCircle } from "lucide-react";
import { cx } from "class-variance-authority";
import { type Id } from "convex/_generated/dataModel";

const ServerMessage = dynamic(
  () => import("./server-message").then((mod) => mod.ServerMessage),
  { ssr: false },
);

export default function ChatWindow() {
  const [drivenIds, setDrivenIds] = useState<Set<string>>(new Set());
  const [isStreaming, setIsStreaming] = useState(false);
  const messages = useQuery(api.messages.listMessages);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const clearAllMessages = useMutation(api.messages.clearMessages);
  const sendMessage = useMutation(api.messages.sendMessage);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior });
      }
    },
    [messagesEndRef],
  );

  const windowSize = useWindowSize();

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    setInput("");

    const chatId = await sendMessage({
      prompt: input,
    });

    setDrivenIds((prev) => {
      prev.add(chatId);
      return prev;
    });

    setIsStreaming(true);
  }, [input, sendMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [windowSize, scrollToBottom]);

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
    <div className="flex h-full flex-1 flex-col bg-white">
      <div
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-12"
      >
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-500">
              No messages yet. Start the conversation!
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
        className="sticky bottom-4"
        onClickSend={handleSend}
        isReady={input.length > 0 && !isStreaming}
      >
        <textarea
          rows={4}
          className="field-sizing-content max-h-36 grow resize-none overflow-y-auto border-none px-2 text-sm outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell me your goal, ask a question, or share what's on your mind."
        />
      </ChatInputContainer>
    </div>
  );
}

// NEW: Conflict Interview ChatWindow
export function ConflictChatWindow({
  conflictId,
  onInterviewComplete,
}: {
  conflictId: Id<"conflicts">;
  onInterviewComplete?: () => void;
}) {
  const [drivenIds, setDrivenIds] = useState<Set<string>>(new Set());
  const [isStreaming, setIsStreaming] = useState(false);
  const messages = useQuery(api.messages.listConflictMessages, {
    conflictId,
  });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useMutation(api.messages.sendConflictMessage);
  const markCompleted = useMutation(api.messages.markInterviewCompleted);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const scrollToBottom = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior });
      }
    },
    [messagesEndRef],
  );

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

  const handleCompleteInterview = useCallback(async () => {
    await markCompleted({ conflictId });
    onInterviewComplete?.();
  }, [markCompleted, conflictId, onInterviewComplete]);

  useEffect(() => {
    scrollToBottom();
  }, [windowSize, scrollToBottom]);

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
    <div className="flex h-full flex-1 flex-col bg-white">
      {/* Header */}
      <div className="border-b bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Interview Assistant</h3>
          {messages.length > 0 && (
            <Button
              onClick={handleCompleteInterview}
              variant="outline"
              size="sm"
              className="text-green-600 hover:bg-green-50"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Complete Interview
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto px-4 py-6 md:px-8 lg:px-12"
      >
        <div className="mx-auto w-full max-w-5xl space-y-6">
          {messages.length === 0 && (
            <div className="space-y-2 text-center text-gray-500">
              <p>
                👋 Hi! I&apos;m here to help understand your conflict better.
              </p>
              <p>
                Share what happened, and I&apos;ll ask some questions to help
                clarify the situation.
              </p>
            </div>
          )}
          {messages.map((message) => {
            // Map conflict message to expected format
            const mappedMessage = {
              _id: message._id as unknown as Id<"userMessages">,
              _creationTime: message._creationTime,
              responseStreamId: message.responseStreamId,
              prompt: message.prompt,
            };

            return (
              <React.Fragment key={message._id}>
                <MessageItem message={mappedMessage} isUser={true}>
                  {message.prompt}
                </MessageItem>
                <MessageItem message={mappedMessage} isUser={false}>
                  <ServerMessage
                    message={mappedMessage}
                    isDriven={drivenIds.has(message._id)}
                    stopStreaming={() => {
                      setIsStreaming(false);
                      focusInput();
                    }}
                    scrollToBottom={scrollToBottom}
                    isConflictMessage={true}
                  />
                </MessageItem>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatInputContainer
        className="sticky bottom-4"
        onClickSend={handleSend}
        isReady={input.length > 0 && !isStreaming}
      >
        <textarea
          rows={4}
          className="field-sizing-content max-h-36 grow resize-none overflow-y-auto border-none px-2 text-sm outline-none"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Share your thoughts about the conflict. I'll ask questions to understand better."
        />
      </ChatInputContainer>
    </div>
  );
}

const ChatInputContainer: FC<
  PropsWithChildren<{
    onClickSparkles?: () => void;
    onClickPaperclip?: () => void;
    onClickMic?: () => void;
    onClickSend?: () => void;
    className?: string;
    isReady?: boolean;
  }>
> = ({
  children,
  onClickSparkles,
  onClickPaperclip,
  onClickMic,
  onClickSend,
  className,
  isReady,
}) => {
  return (
    <div
      className={cx(
        "bg-background flex w-full flex-col gap-4 rounded-2xl border p-3 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-full items-end">
          {onClickSparkles && (
            <Button variant="ghost" size="icon" onClick={onClickSparkles}>
              <Sparkles className="h-4 w-4" />
            </Button>
          )}
          {onClickPaperclip && (
            <Button variant="ghost" size="icon" onClick={onClickPaperclip}>
              <Paperclip className="h-4 w-4" />
            </Button>
          )}
        </div>

        {children}

        <div className="flex h-full items-end gap-2">
          {onClickMic && (
            <Button variant="ghost" size="icon" onClick={onClickMic}>
              <Mic className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            className="text-primary-foreground hover:bg-primary/90"
            onClick={onClickSend}
            disabled={!isReady}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
