"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { type Id } from "convex/_generated/dataModel";
import { PageBack } from "~/components/page-back";
import { Loader2 } from "lucide-react";
import { ConflictChatWindow } from "~/components/chat-window";

function RedirectToStatus({ conflictId }: { conflictId: Id<"conflicts"> }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/conflict/${conflictId}/status`);
  }, [router, conflictId]);
  return (
    <div className="flex flex-1 items-center justify-center py-16">
      <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
    </div>
  );
}

export default function ConflictIntakePage({
  params,
}: {
  params: Promise<{ id: Id<"conflicts"> }>;
}) {
  const { id } = use(params);

  const conflict = useQuery(api.conflicts.getConflict, {
    conflictId: id,
  });

  if (conflict === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (conflict === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">Conflict not found.</p>
      </div>
    );
  }

  if (conflict.intakeStepDone === true || conflict.status === "in_progress") {
    return <RedirectToStatus conflictId={id} />;
  }

  return (
    <div className="bg-background flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        <div className="mb-4 flex items-center gap-1">
          <PageBack href="/" label="Back to your conflicts" />
          <h1 className="text-lg font-semibold">Conflict intake</h1>
        </div>
        <ConflictChatWindow conflictId={id} />
      </div>
    </div>
  );
}
