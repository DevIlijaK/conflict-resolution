import { defineSchema, defineTable } from "convex/server";
import { StreamIdValidator } from "@convex-dev/persistent-text-streaming";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUser: v.any(),
    color: v.string(),
  }).index("by_clerk_id", ["clerkUser.id"]),

  conflictMessages: defineTable({
    conflictId: v.id("conflicts"),
    prompt: v.string(),
    responseStreamId: v.optional(StreamIdValidator),
    responseText: v.optional(v.string()),
    userId: v.id("users"),
    type: v.union(
      v.literal("interview"),
      v.literal("owner_analysis"),
      v.literal("participant_analysis"),
    ),
  })
    .index("by_conflict", ["conflictId"])
    .index("by_stream", ["responseStreamId"])
    .index("by_conflict_and_type", ["conflictId", "type"]),

  conflicts: defineTable({
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
    /** Set when intake chat is closed and the detailed AI summary has been written. */
    intakeStepDone: v.optional(v.boolean()),
  })
    .index("by_creator", ["createdBy"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),
});
