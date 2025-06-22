"use client";

import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { type Id } from "convex/_generated/dataModel";

export default function ConflictSetup({
  params,
}: {
  params: Promise<{ id: Id<"conflicts"> }>;
}) {
  const { id } = use(params);

  return (
    <div className="container mx-auto space-y-6 p-6">
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

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              This is where you would configure the conflict details and invite
              participants.
            </p>

            <div className="space-y-2">
              <h3 className="font-medium">TODO: Implement</h3>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>• Participant invitation form</li>
                <li>• Conflict category selection</li>
                <li>• Privacy settings</li>
                <li>• Notification preferences</li>
              </ul>
            </div>

            <div className="pt-4">
              <Link href={`/conflict/${id}/interview`}>
                <Button>Continue to Interview</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
