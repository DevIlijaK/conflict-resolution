"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { type Id } from "convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { Loader2 } from "lucide-react";

/** Client-only: `@convex-dev/persistent-text-streaming/react` must not run during SSR. */
const ConflictChatWindow = dynamic(
  () =>
    import("~/components/chat-window").then((mod) => mod.ConflictChatWindow),
  {
    ssr: false,
    loading: () => (
      <div className="text-muted-foreground flex min-h-[50vh] items-center justify-center text-sm">
        Loading chat…
      </div>
    ),
  },
);

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
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (conflict === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <p className="text-muted-foreground">Conflict not found.</p>
      </div>
    );
  }

  if (conflict.intakeStepDone === true) {
    return (
      <div className="bg-background flex min-h-dvh items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              first step finished
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Your conversation is saved and a detailed summary was generated for
              the next stages.
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild variant="outline" className="w-full">
                <Link href={`/conflict/${id}/status`}>View status</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Back home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (conflict.status === "in_progress") {
    return (
      <div className="bg-background flex min-h-dvh flex-col items-center justify-center gap-6 p-6">
        <Loader2 className="text-muted-foreground h-10 w-10 animate-spin" />
        <p className="text-muted-foreground max-w-sm text-center text-sm">
          The chat is closed. Another model is writing a detailed title and
          summary from your conversation…
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/conflict/${id}/status`}>View status</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <header className="border-b px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <h1 className="text-lg font-semibold">Conflict intake</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/conflict/${id}/status`}>Status</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Home</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-4">
        <ConflictChatWindow conflictId={id} />
      </main>
    </div>
  );
}
