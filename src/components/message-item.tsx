import { Bot, User } from "lucide-react";
import { cn } from "~/lib/utils";
import { type Doc } from "convex/_generated/dataModel";

type Props = {
  message: Doc<"conflictMessages">;
  children: React.ReactNode;
  isUser: boolean;
};

export default function MessageItem({ message, children, isUser }: Props) {
  return (
    <>
      {isUser && (
        <div className="my-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <div className="text-xs text-muted-foreground">
            {new Date(message._creationTime).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "flex max-w-[90%] gap-2.5 md:max-w-[80%]",
            isUser && "flex-row-reverse",
          )}
        >
          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
            )}
            aria-hidden="true"
          >
            {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
          </div>

          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm leading-relaxed",
              isUser
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
