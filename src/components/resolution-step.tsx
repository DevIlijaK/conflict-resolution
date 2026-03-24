import type { ReactNode } from "react";
import { Badge } from "~/components/ui/badge";
import { CheckCircle2, Circle, Lock, Loader2 } from "lucide-react";

export type StepStatus =
  | "not_started"
  | "in_progress"
  | "summarizing"
  | "complete"
  | "locked";

const badgeConfig: Record<
  StepStatus,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  complete: { label: "Complete", variant: "default" },
  summarizing: { label: "Summarising", variant: "secondary" },
  in_progress: { label: "In progress", variant: "secondary" },
  not_started: { label: "Not started", variant: "outline" },
  locked: { label: "Coming soon", variant: "outline" },
};

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "complete") {
    return (
      <CheckCircle2 className="text-primary h-6 w-6" aria-hidden />
    );
  }
  if (status === "summarizing") {
    return (
      <Loader2
        className="text-muted-foreground h-6 w-6 animate-spin"
        aria-hidden
      />
    );
  }
  if (status === "locked") {
    return (
      <Lock
        className="text-muted-foreground h-6 w-6"
        strokeWidth={1.5}
        aria-hidden
      />
    );
  }
  return (
    <Circle
      className="text-muted-foreground h-6 w-6"
      strokeWidth={1.5}
      aria-hidden
    />
  );
}

type ResolutionStepProps = {
  number: number;
  title: string;
  status: StepStatus;
  description: string;
  actions?: ReactNode;
};

export function ResolutionStep({
  number,
  title,
  status,
  description,
  actions,
}: ResolutionStepProps) {
  const locked = status === "locked";
  const { label, variant } = badgeConfig[status];

  return (
    <li className={locked ? "flex gap-4 opacity-60" : "flex gap-4"}>
      <div className="flex shrink-0 flex-col items-center pt-0.5">
        <StepIcon status={status} />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {number}. {title}
          </span>
          <Badge variant={variant}>{label}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">{description}</p>
        {actions}
      </div>
    </li>
  );
}
