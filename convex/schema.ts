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

  conflicts: defineTable({
    title: v.string(),
    description: v.string(),
    createdBy: v.id("users"), // The user who created the conflict
    status: v.union(
      v.literal("draft"),
      v.literal("in_progress"),
      v.literal("analyzing"),
      v.literal("resolved"),
      v.literal("archived"),
    ),
    // AI Interview responses from creator
    creatorResponses: v.optional(
      v.array(
        v.object({
          question: v.string(),
          answer: v.string(),
          timestamp: v.number(),
        }),
      ),
    ),
    // AI Analysis results (based on creator responses for now)
    analysis: v.optional(
      v.object({
        rootCauseAnalysis: v.string(),
        creatorPerspective: v.string(),
        actionableSteps: v.array(v.string()),
        communicationStrategies: v.array(v.string()),
        generatedAt: v.number(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_creator", ["createdBy"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),
});
