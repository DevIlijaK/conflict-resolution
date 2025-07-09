import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
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

// Internal query to get conflict without authentication (for actions)
export const getConflictInternal = internalQuery({
  args: {
    conflictId: v.id("conflicts"),
    requestingUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Query-level filtering - much more efficient!
    return await ctx.db
      .query("conflicts")
      .filter((q) =>
        q.and(
          q.eq(q.field("_id"), args.conflictId),
          q.eq(q.field("createdBy"), args.requestingUserId),
        ),
      )
      .unique();
  },
});

// Update conflict status
export const updateConflictStatus = mutation({
  args: {
    conflictId: v.id("conflicts"),
    status: v.union(
      v.literal("draft"),
      v.literal("interview"),
      v.literal("in_progress"),
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

export const deleteConflict = mutation({
  args: { conflictId: v.id("conflicts") },
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
    interview: v.number(),
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
      interview: createdConflicts.filter((c) => c.status === "interview")
        .length,
      inProgress: createdConflicts.filter((c) => c.status === "in_progress")
        .length,
      resolved: createdConflicts.filter((c) => c.status === "resolved").length,
      archived: createdConflicts.filter((c) => c.status === "archived").length,
    };

    return stats;
  },
});

// Send invitation email to other party
export const sendInvitation = mutation({
  args: {
    conflictId: v.id("conflicts"),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const conflict = await ctx.db.get(args.conflictId);

    if (!conflict) {
      throw new Error("Conflict not found");
    }

    // Only creator can send invitations
    if (conflict.createdBy !== user._id) {
      throw new Error(
        "Access denied: Only the conflict creator can send invitations",
      );
    }

    // Extract sender email from Clerk user data with better fallback handling
    let senderEmail = "";

    // Try different ways to get the email from Clerk user data
    if (user.clerkUser.primaryEmailAddress?.emailAddress) {
      senderEmail = user.clerkUser.primaryEmailAddress.emailAddress;
    } else if (
      user.clerkUser.email_addresses &&
      user.clerkUser.email_addresses.length > 0
    ) {
      senderEmail = user.clerkUser.email_addresses[0].email_address;
    } else if (user.clerkUser.email) {
      senderEmail = user.clerkUser.email;
    }

    if (!senderEmail) {
      throw new Error(
        "Unable to find sender email address. Please ensure your email is properly configured in your account.",
      );
    }

    // Schedule the email sending action with user information
    await ctx.scheduler.runAfter(0, api.email.sendInvitationEmail, {
      conflictId: args.conflictId,
      email: args.email,
      senderUserId: user._id,
      senderEmail: senderEmail,
    });

    return null;
  },
});
