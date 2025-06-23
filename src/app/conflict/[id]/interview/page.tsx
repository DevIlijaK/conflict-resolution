"use client";

import { use, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import Link from "next/link";
import { type Id } from "convex/_generated/dataModel";

export default function ConflictInterview({
  params,
}: {
  params: Promise<{ id: Id<"conflicts"> }>;
}) {
  const { id } = use(params);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const sendInvitation = useMutation(api.conflicts.sendInvitation);

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      await sendInvitation({ conflictId: id, email: email.trim() });
      setEmailSent(true);
      setEmail("");
    } catch (error) {
      console.error("Failed to send invitation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invite Other Party</h1>
          <p className="text-muted-foreground">
            Send an invitation to the other person involved in this conflict
          </p>
        </div>
        <Link href={`/conflict/${id}`}>
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          {emailSent ? (
            <div className="space-y-4 text-center">
              <div className="text-lg text-green-600">✓ Invitation Sent!</div>
              <p className="text-muted-foreground">
                An invitation has been sent to {email}. They will receive an
                email with instructions to join this conflict resolution.
              </p>
              <Button onClick={() => setEmailSent(false)}>
                Send Another Invitation
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter the other person's email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Link href={`/conflict/${id}/setup`}>
                  <Button variant="outline">Previous Step</Button>
                </Link>
                <Button type="submit" disabled={isSubmitting || !email.trim()}>
                  {isSubmitting ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
