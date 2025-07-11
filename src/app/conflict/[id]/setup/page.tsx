"use client";

import { use, useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { type Id } from "convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { ConflictChatWindow } from "~/components/chat-window";
import { useQuery } from "convex/react";
import { api } from "~/convex/_generated/api";
import { isInterviewCompleted } from "~/lib/conflict-utils";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function ConflictSetup({
  params,
}: {
  params: Promise<{ id: Id<"conflicts"> }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [countdown, setCountdown] = useState(10); // 10 second countdown

  const conflict = useQuery(api.conflicts.getConflict, {
    conflictId: id,
  });

  const interviewCompleted = conflict
    ? isInterviewCompleted(conflict.status)
    : false;

  // Auto-redirect with countdown when interview is completed
  useEffect(() => {
    if (interviewCompleted) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            router.push(`/conflict/${id}/waiting`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [interviewCompleted, id, router]);

  if (!conflict) {
    return <div>Conflict not found</div>;
  }

  // Show completion state when interview is finished
  if (interviewCompleted) {
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

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Card className="w-full max-w-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                <div className="animate-bounce">
                  <svg
                    className="h-10 w-10 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-2xl">Interview Completed!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 text-center">
              <p className="text-muted-foreground text-lg">
                Great job! You have successfully completed the interview phase.
                The AI will now analyze your responses and prepare
                recommendations.
              </p>

              <div className="flex flex-col gap-3">
                <Button asChild className="w-full" size="lg">
                  <Link href={`/conflict/${id}/waiting`}>
                    Continue to Analysis
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/conflict/${id}`}>Back to Dashboard</Link>
                </Button>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                    {countdown}
                  </div>
                  <span className="text-muted-foreground text-sm">
                    Auto-redirecting in {countdown} second
                    {countdown !== 1 ? "s" : ""}...
                  </span>
                </div>
                <div className="bg-background mt-2 h-2 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
        <ConflictChatWindow conflictId={id} />
      </div>
    </div>
  );
}
