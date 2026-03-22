"use client";

import Link from "next/link";
import { useState } from "react";
import { Authenticated, Unauthenticated, useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { useRouter } from "next/navigation";
import LoginForm from "~/components/login-form";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export default function Home() {
  return (
    <>
      <Authenticated>
        <div className="bg-background flex min-h-dvh w-full flex-col items-center justify-center p-6">
          <StartIntakeCard />
        </div>
      </Authenticated>
      <Unauthenticated>
        <main className="bg-background flex min-h-dvh w-full items-center justify-center p-6">
          <LoginForm />
        </main>
      </Unauthenticated>
    </>
  );
}

function StartIntakeCard() {
  const router = useRouter();
  const createConflict = useMutation(api.conflicts.createConflict);
  const [busy, setBusy] = useState(false);

  const handleStart = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const conflictId = await createConflict();
      router.push(`/conflict/${conflictId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Conflict intake</CardTitle>
        <CardDescription>
          Start a short chat with an assistant that learns what happened. When it
          has enough detail, it closes the chat and a second model writes a
          detailed summary for later steps.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button
          className="w-full"
          disabled={busy}
          onClick={() => void handleStart()}
        >
          {busy ? "Starting…" : "Create conflict"}
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/conflicts">View all conflicts</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
