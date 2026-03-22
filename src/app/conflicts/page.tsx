"use client";

import Link from "next/link";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import LoginForm from "~/components/login-form";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

const statusLabel: Record<
  "draft" | "interview" | "in_progress" | "resolved" | "archived",
  string
> = {
  draft: "Draft",
  interview: "Interview",
  in_progress: "In progress",
  resolved: "Resolved",
  archived: "Archived",
};

function formatWhen(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function ConflictsPage() {
  return (
    <>
      <Authenticated>
        <ConflictsList />
      </Authenticated>
      <Unauthenticated>
        <main className="bg-background flex min-h-dvh w-full items-center justify-center p-6">
          <LoginForm />
        </main>
      </Unauthenticated>
    </>
  );
}

function ConflictsList() {
  const conflicts = useQuery(api.conflicts.listMyConflicts);

  return (
    <div className="bg-background flex min-h-dvh w-full flex-col items-center p-6">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            Your conflicts
          </h1>
          <Button variant="outline" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>

        {conflicts === undefined ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              Loading…
            </CardContent>
          </Card>
        ) : conflicts.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No conflicts yet</CardTitle>
              <CardDescription>
                Start one from the home page to see it here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/">Create conflict</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul className="flex flex-col gap-3">
            {conflicts.map((c) => (
              <li key={c._id}>
                <ConflictRow conflict={c} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ConflictRow({
  conflict,
}: {
  conflict: {
    _id: Id<"conflicts">;
    title: string;
    status: keyof typeof statusLabel;
    createdAt: number;
    updatedAt: number;
  };
}) {
  return (
    <Card className="transition-colors hover:bg-muted/40">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
        <div className="min-w-0 flex-1">
          <CardTitle className="text-base font-medium">
            <Link
              href={`/conflict/${conflict._id}`}
              className="text-foreground hover:underline"
            >
              {conflict.title}
            </Link>
          </CardTitle>
          <CardDescription className="mt-1">
            Updated {formatWhen(conflict.updatedAt)}
          </CardDescription>
        </div>
        <Badge variant="secondary">{statusLabel[conflict.status]}</Badge>
      </CardHeader>
      <CardContent className="pt-0">
        <Button variant="link" className="h-auto p-0" asChild>
          <Link href={`/conflict/${conflict._id}`}>Open</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
