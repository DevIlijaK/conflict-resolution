"use client";

import { use } from "react";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { type Id } from "convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { ConflictChatWindow } from "~/components/chat-window";
import { useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";

export default function ConflictSetup({
  params,
}: {
  params: Promise<{ id: Id<"conflicts"> }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const conflict = useQuery(api.conflicts.getConflict, {
    conflictId: id,
  });

  if (!conflict) {
    return <div>Conflict not found</div>;
  }

  const handleInterviewComplete = () => {
    // Navigate to the next step in the conflict resolution process
    router.push(`/conflict/${id}/interview`);
  };

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6 sm:w-[768px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Setup Conflict</h1>
          <p className="text-muted-foreground">
            Configure your conflict resolution process
          </p>
        </div>
        <Link href={`/conflict/${id}`}>
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <div className="min-h-0 flex-1">
        <ConflictChatWindow
          conflictId={id}
          onInterviewComplete={handleInterviewComplete}
        />
      </div>
    </div>
  );
}
