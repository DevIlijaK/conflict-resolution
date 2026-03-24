import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { type StreamId } from "@convex-dev/persistent-text-streaming";
import { v } from "convex/values";
import { streamingComponent } from "./streaming";
import { mustGetCurrentUser } from "./users";

export const listConflictMessages = query({
  args: {
    conflictId: v.id("conflicts"),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);

    const conflict = await ctx.db.get(args.conflictId);
    if (!conflict || conflict.createdBy !== user._id) {
      throw new Error(
        "Access denied: You can only view your own conflict messages",
      );
    }

    return await ctx.db
      .query("conflictMessages")
      .withIndex("by_conflict", (q) => q.eq("conflictId", args.conflictId))
      .collect();
  },
});

export const sendConflictMessage = mutation({
  args: {
    conflictId: v.id("conflicts"),
    prompt: v.string(),
  },
  returns: v.id("conflictMessages"),
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);

    const conflict = await ctx.db.get(args.conflictId);
    if (!conflict || conflict.createdBy !== user._id) {
      throw new Error(
        "Access denied: You can only send messages to your own conflicts",
      );
    }

    if (conflict.intakeStepDone === true || conflict.status === "in_progress") {
      throw new Error("Intake has already ended.");
    }

    const responseStreamId = await streamingComponent.createStream(ctx);

    const chatId = await ctx.db.insert("conflictMessages", {
      conflictId: args.conflictId,
      prompt: args.prompt,
      responseStreamId,
      userId: user._id,
      type: "interview",
    });

    if (conflict.status === "draft") {
      await ctx.db.patch(args.conflictId, {
        status: "interview",
        updatedAt: Date.now(),
      });
    }

    return chatId;
  },
});

export const getInterviewHistory = internalQuery({
  args: {
    conflictId: v.id("conflicts"),
  },
  returns: v.object({
    conflict: v.any(),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const conflict = await ctx.db.get(args.conflictId);
    if (!conflict) {
      throw new Error("Conflict not found");
    }

    const allMessages = await ctx.db
      .query("conflictMessages")
      .withIndex("by_conflict", (q) => q.eq("conflictId", args.conflictId))
      .collect();

    const messagesWithResponses = await Promise.all(
      allMessages.map(async (userMessage) => {
        const assistantContent = userMessage.responseStreamId
          ? (await streamingComponent.getStreamBody(ctx, userMessage.responseStreamId as StreamId)).text
          : (userMessage.responseText ?? "");
        return { userMessage, assistantContent };
      }),
    );

    return {
      conflict,
      messages: messagesWithResponses.flatMap(({ userMessage, assistantContent }) => {
        const user = {
          role: "user" as const,
          content: userMessage.prompt,
        };

        const assistant = {
          role: "assistant" as const,
          content: assistantContent,
        };

        if (!assistant.content) return [user];

        return [user, assistant];
      }),
    };
  },
});

export const updateConflictInternal = internalMutation({
  args: {
    conflictId: v.id("conflicts"),
    updates: v.object({
      status: v.optional(
        v.union(
          v.literal("draft"),
          v.literal("interview"),
          v.literal("in_progress"),
          v.literal("resolved"),
          v.literal("archived"),
        ),
      ),
      title: v.optional(v.string()),
      description: v.optional(v.string()),
      updatedAt: v.optional(v.number()),
      intakeStepDone: v.optional(v.boolean()),
    }),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const conflict = await ctx.db.get(args.conflictId);
    if (!conflict) {
      throw new Error("Conflict not found");
    }

    const updatesWithTimestamp = {
      ...args.updates,
      updatedAt: args.updates.updatedAt ?? Date.now(),
    };

    await ctx.db.patch(args.conflictId, updatesWithTimestamp);

    return updatesWithTimestamp;
  },
});

export const getConflictMessageByStreamId = internalQuery({
  args: {
    streamId: v.string(),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conflictMessages")
      .withIndex("by_stream", (q) => q.eq("responseStreamId", args.streamId))
      .unique();
  },
});
