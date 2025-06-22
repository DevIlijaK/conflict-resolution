"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import ChatWindow from "./components/chat-window";
import LoginForm from "./components/login-form";

export default function Home() {
  return (
    <main className="flex h-screen flex-col">
      <>
        <Authenticated>
          <ChatWindow />
        </Authenticated>
        <Unauthenticated>
          <LoginForm />
        </Unauthenticated>
      </>
    </main>
  );
}
