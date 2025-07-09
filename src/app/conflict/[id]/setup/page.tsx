"use client";

import { use } from "react";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { type Id } from "convex/_generated/dataModel";
import { ConflictChatWindow } from "~/components/chat-window";
import { useRouter } from "next/navigation";

export default function ConflictSetup({
  params,
}: {
  params: Promise<{ id: Id<"conflicts"> }>;
}) {
  const { id } = use(params);
  const router = useRouter();

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
        <h2 className="text-lg font-bold">AI Interview Assistant</h2>
        <ConflictChatWindow
          conflictId={id}
          onInterviewComplete={handleInterviewComplete}
        />
      </div>
    </div>
  );
}
