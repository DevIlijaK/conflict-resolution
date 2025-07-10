"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { type Doc, type Id } from "convex/_generated/dataModel";
import { CardDescription, CardFooter } from "~/components/ui/card";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
import { Separator } from "~/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useState } from "react";
import Link from "next/link";
import { isInterviewCompleted } from "~/lib/conflict-utils";

type ConflictStatus =
  | "draft"
  | "interview"
  | "in_progress"
  | "resolved"
  | "archived";

export default function ConflictManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newConflict, setNewConflict] = useState({
    title: "",
    description: "",
  });
  const [editingConflict, setEditingConflict] = useState<{
    id: Id<"conflicts">;
    title: string;
    description: string;
  } | null>(null);

  const conflicts = useQuery(api.conflicts.getUserConflicts);
  const stats = useQuery(api.conflicts.getConflictStats);
  const createConflict = useMutation(api.conflicts.createConflict);
  const updateConflictDetails = useMutation(
    api.conflicts.updateConflictDetails,
  );
  const deleteConflict = useMutation(api.conflicts.deleteConflict);
  const updateConflictStatus = useMutation(api.conflicts.updateConflictStatus);

  const handleCreateConflict = async () => {
    if (!newConflict.title.trim() || !newConflict.description.trim()) {
      return;
    }

    await createConflict(newConflict);
    setNewConflict({ title: "", description: "" });
    setIsCreateDialogOpen(false);
  };

  const handleEditConflict = async () => {
    if (!editingConflict) return;

    if (!editingConflict.title.trim() || !editingConflict.description.trim()) {
      return;
    }

    await updateConflictDetails({
      conflictId: editingConflict.id,
      title: editingConflict.title,
      description: editingConflict.description,
    });
    setEditingConflict(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteConflict = async (conflictId: Id<"conflicts">) => {
    if (
      window.confirm(
        "Are you sure you want to delete this conflict? This action cannot be undone.",
      )
    ) {
      await deleteConflict({ conflictId });
    }
  };

  const handleStatusChange = async (
    conflictId: Id<"conflicts">,
    status: ConflictStatus,
  ) => {
    await updateConflictStatus({
      conflictId,
      status,
    });
  };

  const getStatusColor = (status: ConflictStatus) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "interview":
        return "outline";
      case "in_progress":
        return "default";
      case "resolved":
        return "default";
      case "archived":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  if (conflicts === undefined || stats === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading conflicts...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Conflict Management</h1>
          <p className="text-muted-foreground">
            Manage your conflicts and track their resolution progress
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Create Conflict
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Conflict</DialogTitle>
            <DialogDescription>
              Describe the conflict you want to resolve.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Brief description of the conflict"
                value={newConflict.title}
                onChange={(e) =>
                  setNewConflict({ ...newConflict, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of the conflict, including context, people involved, and what happened"
                value={newConflict.description}
                onChange={(e) =>
                  setNewConflict({
                    ...newConflict,
                    description: e.target.value,
                  })
                }
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewConflict({ title: "", description: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateConflict}>Create Conflict</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Interview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.interview}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.archived}</div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Conflicts List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Conflicts</h2>

        {conflicts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <div className="space-y-2 text-center">
                <h3 className="text-lg font-medium">No conflicts yet</h3>
                <p className="text-muted-foreground">
                  Create your first conflict to begin the resolution process.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  Create First Conflict
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {conflicts.map((conflict: Doc<"conflicts">) => (
              <Card key={conflict._id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">
                        {conflict.title}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        Created {formatDate(conflict.createdAt)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(conflict.status)}>
                        {conflict.status.replace("_", " ")}
                      </Badge>
                      <select
                        value={conflict.status}
                        onChange={(e) =>
                          handleStatusChange(
                            conflict._id,
                            e.target.value as ConflictStatus,
                          )
                        }
                        className="rounded border px-2 py-1 text-xs"
                      >
                        <option value="draft">Draft</option>
                        <option value="interview">Interview</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-3 text-sm">
                    {conflict.description}
                  </p>

                  {isInterviewCompleted(conflict.status) && (
                    <div className="text-muted-foreground mt-3 text-xs">
                      ✓ Interview completed
                    </div>
                  )}
                </CardContent>
                <CardFooter className="gap-2">
                  <Link href={`/conflict/${conflict._id}`}>
                    <Button size="sm">Open</Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingConflict({
                        id: conflict._id,
                        title: conflict.title,
                        description: conflict.description,
                      });
                      setIsEditDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteConflict(conflict._id)}
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Conflict</DialogTitle>
            <DialogDescription>
              Make changes to your conflict details.
            </DialogDescription>
          </DialogHeader>
          {editingConflict && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingConflict.title}
                  onChange={(e) =>
                    setEditingConflict({
                      ...editingConflict,
                      title: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingConflict.description}
                  onChange={(e) =>
                    setEditingConflict({
                      ...editingConflict,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingConflict(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleEditConflict}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
