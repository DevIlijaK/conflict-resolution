"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

type IntakePhase = "not_started" | "conversation" | "summarizing" | "complete";

function intakePhase(conflict: {
  status: string;
  intakeStepDone?: boolean;
}): IntakePhase {
  if (conflict.intakeStepDone === true) return "complete";
  if (conflict.status === "in_progress") return "summarizing";
  if (conflict.status === "draft") return "not_started";
  return "conversation";
}

export default function ConflictStatusPage({
  params,
}: {
  params: Promise<{ id: Id<"conflicts"> }>;
}) {
  const { id } = use(params);
  const conflict = useQuery(api.conflicts.getConflict, { conflictId: id });

  if (conflict === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (conflict === null) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center p-6">
        <p className="text-muted-foreground">Conflict not found.</p>
      </div>
    );
  }

  const phase = intakePhase(conflict);
  const intakeComplete = phase === "complete";
  const canOpenChat =
    !intakeComplete && conflict.status !== "in_progress";

  return (
    <div className="bg-background min-h-dvh">
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Conflict status</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/conflict/${id}`}>Intake</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/conflicts">All conflicts</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div>
          <p className="text-muted-foreground text-sm">Conflict</p>
          <p className="text-foreground text-xl font-semibold tracking-tight">
            {conflict.title}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stages</CardTitle>
            <CardDescription>
              For now there is one stage: intake. More steps will show here when
              they exist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              <li className="flex gap-4">
                <div className="flex shrink-0 flex-col items-center pt-0.5">
                  {intakeComplete ? (
                    <CheckCircle2
                      className="text-primary h-6 w-6"
                      aria-hidden
                    />
                  ) : phase === "summarizing" ? (
                    <Loader2
                      className="text-muted-foreground h-6 w-6 animate-spin"
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="text-muted-foreground h-6 w-6"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">1. Intake</span>
                    {intakeComplete ? (
                      <Badge>Finished</Badge>
                    ) : phase === "summarizing" ? (
                      <Badge variant="secondary">In progress</Badge>
                    ) : phase === "not_started" ? (
                      <Badge variant="outline">Not started</Badge>
                    ) : (
                      <Badge variant="secondary">In progress</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {intakeComplete &&
                      "Your conversation is saved and a detailed summary was written for later steps."}
                    {phase === "summarizing" &&
                      "The chat is closed. A separate model is writing a detailed title and summary from your conversation."}
                    {phase === "conversation" &&
                      "Answer the assistant’s questions so the factual record is complete."}
                    {phase === "not_started" &&
                      "Open intake and send a first message to begin."}
                  </p>
                  {canOpenChat && (
                    <Button size="sm" asChild>
                      <Link href={`/conflict/${id}`}>Go to intake chat</Link>
                    </Button>
                  )}
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
