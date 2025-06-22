"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import Link from "next/link";
import { type Id } from "convex/_generated/dataModel";

export default function ConflictDashboard({
  params,
}: {
  params: Promise<{ id: Id<"conflicts"> }>;
}) {
  const { id } = use(params);

  const conflict = useQuery(api.conflicts.getConflict, {
    conflictId: id,
  });

  if (conflict === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading conflict...</div>
      </div>
    );
  }

  if (conflict === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg text-red-600">Conflict not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{conflict.title}</h1>
          <p className="text-muted-foreground mt-2">{conflict.description}</p>
        </div>
        <Badge variant="secondary">{conflict.status.replace("_", " ")}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conflict Resolution Flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {/* Setup Step */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <h3 className="font-medium">1. Setup Conflict</h3>
                <p className="text-muted-foreground text-sm">
                  Configure conflict details and invite participant
                </p>
              </div>
              <Link href={`/conflict/${id}/setup`}>
                <Button variant="outline">
                  {conflict.status === "draft"
                    ? "Continue Setup"
                    : "Review Setup"}
                </Button>
              </Link>
            </div>

            {/* Interview Step */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <h3 className="font-medium">2. AI Interview</h3>
                <p className="text-muted-foreground text-sm">
                  Complete your interview with the AI
                </p>
                {conflict.creatorResponses && (
                  <p className="mt-1 text-xs text-green-600">
                    ✓ Interview completed
                  </p>
                )}
              </div>
              <Link href={`/conflict/${id}/interview`}>
                <Button variant="outline">
                  {conflict.creatorResponses
                    ? "Review Interview"
                    : "Start Interview"}
                </Button>
              </Link>
            </div>

            {/* Waiting Step */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <h3 className="font-medium">3. Waiting for Analysis</h3>
                <p className="text-muted-foreground text-sm">
                  Waiting for participant and AI analysis
                </p>
              </div>
              <Link href={`/conflict/${id}/waiting`}>
                <Button variant="outline">View Status</Button>
              </Link>
            </div>

            {/* Resolution Step */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <h3 className="font-medium">4. Resolution</h3>
                <p className="text-muted-foreground text-sm">
                  View AI analysis and recommendations
                </p>
                {conflict.analysis && (
                  <p className="mt-1 text-xs text-green-600">
                    ✓ Analysis available
                  </p>
                )}
              </div>
              <Link href={`/conflict/${id}/resolution`}>
                <Button variant="outline" disabled={!conflict.analysis}>
                  {conflict.analysis ? "View Resolution" : "Not Ready"}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
