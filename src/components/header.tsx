"use client";

import { MessageSquare } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <header className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-blue-100 p-2">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">ConflictChat</h1>
        </div>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </div>
    </header>
  );
}
