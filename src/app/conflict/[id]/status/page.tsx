"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { PageBack } from "~/components/page-back";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  ResolutionStep,
  type StepStatus,
} from "~/components/resolution-step";

function intakeStatus(conflict: {
  status: string;
  intakeStepDone?: boolean;
}): StepStatus {
  if (conflict.intakeStepDone === true) return "complete";
  if (conflict.status === "in_progress") return "summarizing";
  if (conflict.status === "draft") return "not_started";
  return "in_progress";
}

const step1Copy: Record<StepStatus, string> = {
  complete:
    "Your account has been recorded and summarised for the next steps.",
  summarizing:
    "The chat is closed. The AI is writing a summary of your account.",
  in_progress:
    "Answer the assistant\u2019s questions so your side of the story is complete.",
  not_started:
    "Open the intake chat and describe what happened to begin.",
  locked: "",
};

export default function ConflictStatusPage({
  params,
}: {
  params: Promise<{ id: Id<"conflicts"> }>;
}) {
  const { id } = use(params);
  const conflict = useQuery(api.conflicts.getConflict, { conflictId: id });

  if (conflict === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (conflict === null) {
    return (
      <div className="bg-background flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Conflict not found.</p>
      </div>
    );
  }

  const phase = intakeStatus(conflict);
  const intakeComplete = phase === "complete";
  const canOpenChat = !intakeComplete && conflict.status !== "in_progress";
  const canViewTranscript = intakeComplete || phase === "summarizing";

  return (
    <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto min-h-0 w-full max-w-2xl flex-1 space-y-6 overflow-y-auto px-4 py-8">
        <div className="flex items-center gap-1">
          <PageBack href="/" label="Back to your conflicts" />
          <h1 className="text-lg font-semibold">Conflict status</h1>
        </div>

        <div>
          <p className="text-muted-foreground text-sm">Conflict</p>
          <p className="text-foreground text-xl font-semibold tracking-tight">
            {conflict.title}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resolution steps</CardTitle>
            <CardDescription>
              Every conflict moves through three steps: both people share their
              perspective, then the AI synthesises a fair summary with
              actionable next moves.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-6">
              <ResolutionStep
                number={1}
                title="Your perspective"
                status={phase}
                description={step1Copy[phase]}
                actions={
                  (canOpenChat || canViewTranscript) && (
                    <div className="flex flex-wrap gap-2">
                      {canOpenChat && (
                        <Button size="sm" asChild>
                          <Link href={`/conflict/${id}`}>
                            Share your perspective
                          </Link>
                        </Button>
                      )}
                      {canViewTranscript && (
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/conflict/${id}/intake/transcript`}>
                            View your transcript
                          </Link>
                        </Button>
                      )}
                    </div>
                  )
                }
              />

              <li className="border-t border-border" aria-hidden />

              <ResolutionStep
                number={2}
                title="The other person's perspective"
                status="locked"
                description="The other person involved will be invited to share their side through the same guided conversation. This step unlocks after yours is complete."
              />

              <li className="border-t border-border" aria-hidden />

              <ResolutionStep
                number={3}
                title="AI summary & action plan"
                status="locked"
                description="Once both sides have been heard, the AI will produce a balanced summary of what happened and recommend concrete next steps for resolution."
              />
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
