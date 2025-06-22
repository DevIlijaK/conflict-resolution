import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { mustGetCurrentUser } from "./users";

// Create a new conflict (creator only)
export const createConflict = mutation({
  args: {
    title: v.string(),
    description: v.string(),
  },
  returns: v.id("conflicts"),
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const now = Date.now();

    const conflictId = await ctx.db.insert("conflicts", {
      title: args.title,
      description: args.description,
      createdBy: user._id,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });

    return conflictId;
  },
});

// Get all conflicts for the current user (creator only)
export const getUserConflicts = query({
  args: {},
  handler: async (ctx) => {
    const user = await mustGetCurrentUser(ctx);

    const conflicts = await ctx.db
      .query("conflicts")
      .withIndex("by_creator", (q) => q.eq("createdBy", user._id))
      .order("desc")
      .collect();

    return conflicts;
  },
});

// Get a specific conflict by ID (creator only)
export const getConflict = query({
  args: { conflictId: v.id("conflicts") },

  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const conflict = await ctx.db.get(args.conflictId);

    if (!conflict) {
      return null;
    }

    // Check if user is the creator
    if (conflict.createdBy !== user._id) {
      throw new Error("Access denied: You can only view your own conflicts");
    }

    return conflict;
  },
});

// Update conflict status
export const updateConflictStatus = mutation({
  args: {
    conflictId: v.id("conflicts"),
    status: v.union(
      v.literal("draft"),
      v.literal("in_progress"),
      v.literal("analyzing"),
      v.literal("resolved"),
      v.literal("archived"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const conflict = await ctx.db.get(args.conflictId);

    if (!conflict) {
      throw new Error("Conflict not found");
    }

    // Only creator can update status
    if (conflict.createdBy !== user._id) {
      throw new Error(
        "Access denied: Only the conflict creator can update status",
      );
    }

    await ctx.db.patch(args.conflictId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Add creator interview responses
export const addCreatorResponses = mutation({
  args: {
    conflictId: v.id("conflicts"),
    responses: v.array(
      v.object({
        question: v.string(),
        answer: v.string(),
        timestamp: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const conflict = await ctx.db.get(args.conflictId);

    if (!conflict) {
      throw new Error("Conflict not found");
    }

    // Verify user is the creator
    if (conflict.createdBy !== user._id) {
      throw new Error(
        "Access denied: Only the conflict creator can add responses",
      );
    }

    await ctx.db.patch(args.conflictId, {
      creatorResponses: args.responses,
      status: "in_progress",
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Add AI analysis to conflict (simplified for creator only)
export const addAnalysis = mutation({
  args: {
    conflictId: v.id("conflicts"),
    analysis: v.object({
      rootCauseAnalysis: v.string(),
      creatorPerspective: v.string(),
      actionableSteps: v.array(v.string()),
      communicationStrategies: v.array(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const conflict = await ctx.db.get(args.conflictId);

    if (!conflict) {
      throw new Error("Conflict not found");
    }

    // Only creator can add analysis
    if (conflict.createdBy !== user._id) {
      throw new Error(
        "Access denied: Only the conflict creator can add analysis",
      );
    }

    await ctx.db.patch(args.conflictId, {
      analysis: {
        ...args.analysis,
        generatedAt: Date.now(),
      },
      status: "resolved",
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Delete a conflict
export const deleteConflict = mutation({
  args: { conflictId: v.id("conflicts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const conflict = await ctx.db.get(args.conflictId);

    if (!conflict) {
      throw new Error("Conflict not found");
    }

    // Only creator can delete
    if (conflict.createdBy !== user._id) {
      throw new Error(
        "Access denied: Only the conflict creator can delete the conflict",
      );
    }

    await ctx.db.delete(args.conflictId);
    return null;
  },
});

// Update conflict details
export const updateConflictDetails = mutation({
  args: {
    conflictId: v.id("conflicts"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const conflict = await ctx.db.get(args.conflictId);

    if (!conflict) {
      throw new Error("Conflict not found");
    }

    // Only creator can update details
    if (conflict.createdBy !== user._id) {
      throw new Error(
        "Access denied: Only the conflict creator can update details",
      );
    }

    const updateData: Partial<{
      title: string;
      description: string;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      updateData.title = args.title;
    }

    if (args.description !== undefined) {
      updateData.description = args.description;
    }

    await ctx.db.patch(args.conflictId, updateData);
    return null;
  },
});

// Get conflict statistics for dashboard
export const getConflictStats = query({
  args: {},
  returns: v.object({
    total: v.number(),
    draft: v.number(),
    inProgress: v.number(),
    resolved: v.number(),
    archived: v.number(),
  }),
  handler: async (ctx) => {
    const user = await mustGetCurrentUser(ctx);

    const createdConflicts = await ctx.db
      .query("conflicts")
      .withIndex("by_creator", (q) => q.eq("createdBy", user._id))
      .collect();

    const stats = {
      total: createdConflicts.length,
      draft: createdConflicts.filter((c) => c.status === "draft").length,
      inProgress: createdConflicts.filter((c) => c.status === "in_progress")
        .length,
      resolved: createdConflicts.filter((c) => c.status === "resolved").length,
      archived: createdConflicts.filter((c) => c.status === "archived").length,
    };

    return stats;
  },
});
