"use client";

import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { type Id } from "convex/_generated/dataModel";

export default function ConflictInterview({
  params,
}: {
  params: Promise<{ id: Id<"conflicts"> }>;
}) {
  const { id } = use(params);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Interview</h1>
          <p className="text-muted-foreground">
            Complete your interview with our AI mediator
          </p>
        </div>
        <Link href={`/conflict/${id}`}>
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Interview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              The AI will ask you questions to understand your perspective on
              the conflict.
            </p>

            <div className="space-y-2">
              <h3 className="font-medium">TODO: Implement</h3>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>• Dynamic AI questioning system</li>
                <li>• Response collection form</li>
                <li>• Progress tracking</li>
                <li>• Auto-save functionality</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-4">
              <Link href={`/conflict/${id}/setup`}>
                <Button variant="outline">Previous Step</Button>
              </Link>
              <Link href={`/conflict/${id}/waiting`}>
                <Button>Continue to Waiting</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
