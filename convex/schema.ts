import { defineSchema, defineTable } from "convex/server";
import { StreamIdValidator } from "@convex-dev/persistent-text-streaming";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUser: v.any(),
    color: v.string(),
  }).index("by_clerk_id", ["clerkUser.id"]),

  userMessages: defineTable({
    prompt: v.string(),
    responseStreamId: StreamIdValidator,
  }).index("by_stream", ["responseStreamId"]),

  // Interview messages for conflicts
  conflictMessages: defineTable({
    conflictId: v.id("conflicts"),
    prompt: v.string(),
    responseStreamId: StreamIdValidator,
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
    createdBy: v.id("users"), // The user who created the conflict
    status: v.union(
      v.literal("draft"),
      v.literal("interview"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("archived"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["createdBy"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),
});
