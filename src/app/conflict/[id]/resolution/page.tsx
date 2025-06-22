"use client";

import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import Link from "next/link";
import { type Id } from "convex/_generated/dataModel";

export default function ConflictResolution({
  params,
}: {
  params: Promise<{ id: Id<"conflicts"> }>;
}) {
  const { id } = use(params);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Resolution & Analysis</h1>
          <p className="text-muted-foreground">
            AI-generated recommendations for your conflict
          </p>
        </div>
        <Link href={`/conflict/${id}`}>
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Step 4: Resolution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Here you will see the AI analysis and actionable recommendations.
            </p>

            <div className="space-y-2">
              <h3 className="font-medium">TODO: Implement</h3>
              <ul className="text-muted-foreground space-y-1 text-sm">
                <li>• Root cause analysis display</li>
                <li>• Perspective mapping visualization</li>
                <li>• Actionable steps list</li>
                <li>• Communication strategies</li>
                <li>• Download/share functionality</li>
              </ul>
            </div>

            <div className="pt-4">
              <Link href={`/conflict/${id}/waiting`}>
                <Button variant="outline">Previous Step</Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
