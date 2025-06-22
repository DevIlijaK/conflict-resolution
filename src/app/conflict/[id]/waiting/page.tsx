"use client";

import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { type Id } from "convex/_generated/dataModel";

export default function ConflictWaiting({
  params,
}: {
  params: Promise<{ id: Id<"conflicts"> }>;
}) {
  const { id } = use(params);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Waiting for Analysis</h1>
          <p className="text-muted-foreground">
            We&apos;re processing your conflict information
          </p>
        </div>
        <Link href={`/conflict/${id}`}>
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step 3: Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Our AI is analyzing the information and preparing recommendations.
            </p>

            <div className="space-y-2">
              <h3 className="font-medium">TODO: Implement</h3>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>• Real-time status updates</li>
                <li>• Participant progress tracking</li>
                <li>• Estimated completion time</li>
                <li>• Progress indicators</li>
              </ul>
            </div>

            <div className="flex gap-2 pt-4">
              <Link href={`/conflict/${id}/interview`}>
                <Button variant="outline">Previous Step</Button>
              </Link>
              <Link href={`/conflict/${id}/resolution`}>
                <Button disabled>Waiting for Analysis...</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
