"use client";

import Link from "next/link";
import { SignedIn, UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header className="bg-background shrink-0 border-b">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="text-foreground hover:text-foreground/90 text-base font-semibold tracking-tight"
        >
          Resolve
        </Link>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </div>
    </header>
  );
}
