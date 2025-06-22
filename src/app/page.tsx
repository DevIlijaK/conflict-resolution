"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import ConflictManager from "~/components/conflict-manager";
import Header from "~/components/header";
import LoginForm from "~/components/login-form";

export default function Home() {
  return (
    <main className="bg-background min-h-screen">
      <>
        <Authenticated>
          <Header />
          <ConflictManager />
        </Authenticated>
        <Unauthenticated>
          <LoginForm />
        </Unauthenticated>
      </>
    </main>
  );
}
