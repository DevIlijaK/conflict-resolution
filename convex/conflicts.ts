import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { mustGetCurrentUser } from "./users";
import { PENDING_INTAKE_TITLE } from "./intake/constants";

export const createConflict = mutation({
  args: {},
  returns: v.id("conflicts"),
  handler: async (ctx) => {
    const user = await mustGetCurrentUser(ctx);
    const now = Date.now();

    return await ctx.db.insert("conflicts", {
      title: PENDING_INTAKE_TITLE,
      description: "",
      createdBy: user._id,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getConflict = query({
  args: { conflictId: v.id("conflicts") },
  returns: v.union(
    v.object({
      _id: v.id("conflicts"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.string(),
      createdBy: v.id("users"),
      status: v.union(
        v.literal("draft"),
        v.literal("interview"),
        v.literal("in_progress"),
        v.literal("resolved"),
        v.literal("archived"),
      ),
      createdAt: v.number(),
      updatedAt: v.number(),
      intakeStepDone: v.optional(v.boolean()),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const conflict = await ctx.db.get(args.conflictId);

    if (!conflict) {
      return null;
    }

    if (conflict.createdBy !== user._id) {
      throw new Error("Access denied: You can only view your own conflicts");
    }

    return conflict;
  },
});

const conflictListItemValidator = v.object({
  _id: v.id("conflicts"),
  title: v.string(),
  status: v.union(
    v.literal("draft"),
    v.literal("interview"),
    v.literal("in_progress"),
    v.literal("resolved"),
    v.literal("archived"),
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const deleteConflict = mutation({
  args: { conflictId: v.id("conflicts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const conflict = await ctx.db.get(args.conflictId);
    if (!conflict) {
      throw new Error("Conflict not found");
    }
    if (conflict.createdBy !== user._id) {
      throw new Error("Access denied: You can only delete your own conflicts");
    }

    const messages = await ctx.db
      .query("conflictMessages")
      .withIndex("by_conflict", (q) => q.eq("conflictId", args.conflictId))
      .collect();

    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.conflictId);
    return null;
  },
});

export const listMyConflicts = query({
  args: {},
  returns: v.array(conflictListItemValidator),
  handler: async (ctx) => {
    const user = await mustGetCurrentUser(ctx);
    const rows = await ctx.db
      .query("conflicts")
      .withIndex("by_creator", (q) => q.eq("createdBy", user._id))
      .order("desc")
      .collect();
    return rows.map(({ _id, title, status, createdAt, updatedAt }) => ({
      _id,
      title,
      status,
      createdAt,
      updatedAt,
    }));
  },
});
