"use client";

import Link from "next/link";
import { SignedIn, UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header className="bg-background border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="text-foreground hover:text-foreground/90 text-base font-semibold tracking-tight"
        >
          Conflict intake
        </Link>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </header>
  );
}
