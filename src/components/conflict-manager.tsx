"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { type Id, type Doc } from "convex/_generated/dataModel";
import Link from "next/link";

type ConflictStatus =
  | "draft"
  | "interview"
  | "in_progress"
  | "resolved"
  | "archived";

export default function ConflictManager() {
  const conflicts = useQuery(api.conflicts.getUserConflicts);
  const stats = useQuery(api.conflicts.getConflictStats);
  const createConflict = useMutation(api.conflicts.createConflict);
  const deleteConflict = useMutation(api.conflicts.deleteConflict);
  const updateConflictDetails = useMutation(
    api.conflicts.updateConflictDetails,
  );
  const updateConflictStatus = useMutation(api.conflicts.updateConflictStatus);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingConflict, setEditingConflict] = useState<{
    id: Id<"conflicts">;
    title: string;
    description: string;
  } | null>(null);

  const [newConflict, setNewConflict] = useState({
    title: "",
    description: "",
  });

  const handleCreateConflict = async () => {
    if (!newConflict.title.trim() || !newConflict.description.trim()) {
      alert("Please fill in all fields");
      return;
    }

    try {
      await createConflict(newConflict);
      setNewConflict({ title: "", description: "" });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Failed to create conflict:", error);
      alert("Failed to create conflict. Please try again.");
    }
  };

  const handleEditConflict = async () => {
    if (!editingConflict?.title.trim() || !editingConflict.description.trim()) {
      alert("Please fill in all fields");
      return;
    }

    try {
      await updateConflictDetails({
        conflictId: editingConflict.id,
        title: editingConflict.title,
        description: editingConflict.description,
      });
      setEditingConflict(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Failed to update conflict:", error);
      alert("Failed to update conflict. Please try again.");
    }
  };

  const handleDeleteConflict = async (conflictId: Id<"conflicts">) => {
    if (
      !confirm(
        "Are you sure you want to delete this conflict? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await deleteConflict({ conflictId });
    } catch (error) {
      console.error("Failed to delete conflict:", error);
      alert("Failed to delete conflict. Please try again.");
    }
  };

  const handleStatusChange = async (
    conflictId: Id<"conflicts">,
    status: ConflictStatus,
  ) => {
    try {
      await updateConflictStatus({
        conflictId,
        status: status as
          | "draft"
          | "interview"
          | "in_progress"
          | "resolved"
          | "archived",
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update status. Please try again.");
    }
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
        return "destructive";
      case "archived":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            Manage your conflict resolution cases
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>Create New Conflict</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create New Conflict</DialogTitle>
              <DialogDescription>
                Add a new conflict case to begin the resolution process.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter conflict title..."
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
                  placeholder="Describe the conflict situation in detail..."
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
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateConflict}>Create Conflict</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
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

                  {conflict.interviewCompleted && (
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
