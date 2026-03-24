"use client";

import { useState } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { type Id } from "convex/_generated/dataModel";
import { VoiceSession } from "~/components/voice-session";
import LoginForm from "~/components/login-form";
import { Button } from "~/components/ui/button";

function ConflictPicker() {
  const conflicts = useQuery(api.conflicts.listMyConflicts);
  const [selected, setSelected] = useState<Id<"conflicts"> | null>(null);

  if (selected) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelected(null)}>
          &larr; Pick a different conflict
        </Button>
        <VoiceSession conflictId={selected} />
      </div>
    );
  }

  if (conflicts === undefined) {
    return <p className="text-muted-foreground text-sm">Loading conflicts…</p>;
  }

  if (conflicts.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No conflicts yet. Create one first.
      </p>
    );
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <h2 className="text-lg font-semibold">Select a conflict</h2>
      {conflicts.map((c) => (
        <Button
          key={c._id}
          variant="outline"
          className="w-full justify-start"
          onClick={() => setSelected(c._id)}
        >
          {c.title}
        </Button>
      ))}
    </div>
  );
}

export default function VoiceTestPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Authenticated>
        <ConflictPicker />
      </Authenticated>
      <Unauthenticated>
        <LoginForm />
      </Unauthenticated>
    </div>
  );
}
