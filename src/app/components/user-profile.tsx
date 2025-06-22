"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@clerk/nextjs";

export default function UserProfile() {
  const { user: clerkUser } = useUser();
  const convexUser = useQuery(api.users.getCurrentUser);

  if (!clerkUser) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>Please sign in to view your profile.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Clerk User Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p>
              <strong>ID:</strong> {clerkUser.id}
            </p>
            <p>
              <strong>Email:</strong>{" "}
              {clerkUser.primaryEmailAddress?.emailAddress}
            </p>
            <p>
              <strong>First Name:</strong> {clerkUser.firstName}
            </p>
            <p>
              <strong>Last Name:</strong> {clerkUser.lastName}
            </p>
            <p>
              <strong>Created:</strong>{" "}
              {clerkUser.createdAt?.toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Convex Synced User Data</CardTitle>
        </CardHeader>
        <CardContent>
          {convexUser ? (
            <div className="space-y-2">
              <p>
                <strong>Convex ID:</strong> {convexUser._id}
              </p>
              <p>
                <strong>Clerk ID:</strong> {convexUser.clerkId}
              </p>
              <p>
                <strong>Email:</strong> {convexUser.email}
              </p>
              <p>
                <strong>First Name:</strong> {convexUser.firstName ?? "Not set"}
              </p>
              <p>
                <strong>Last Name:</strong> {convexUser.lastName ?? "Not set"}
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {new Date(convexUser.createdAt).toLocaleDateString()}
              </p>
              <p>
                <strong>Updated:</strong>{" "}
                {new Date(convexUser.updatedAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p>
              User not yet synced to Convex. This will happen automatically when
              you perform your first action or via webhook.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
