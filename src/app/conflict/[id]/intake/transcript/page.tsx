"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { type Id } from "convex/_generated/dataModel";
import { PageBack } from "~/components/page-back";
import { Loader2 } from "lucide-react";
import { ConflictChatTranscript } from "~/components/chat-window";

export default function IntakeTranscriptPage({
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

  return (
    <div className="bg-background flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        <div className="mb-4 flex items-start gap-1">
          <PageBack
            href={`/conflict/${id}/status`}
            label="Back to conflict status"
          />
          <div className="min-w-0 pt-1.5">
            <h1 className="text-lg font-semibold leading-none">
              Intake transcript
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Read-only copy of your intake conversation with the assistant.
            </p>
          </div>
        </div>
        <ConflictChatTranscript conflictId={id} />
      </div>
    </div>
  );
}
