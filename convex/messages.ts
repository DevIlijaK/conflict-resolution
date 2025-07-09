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

export const listMessages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userMessages").collect();
  },
});

export const clearMessages = mutation({
  args: {},
  handler: async (ctx) => {
    const chats = await ctx.db.query("userMessages").collect();
    await Promise.all(chats.map((chat) => ctx.db.delete(chat._id)));
  },
});

export const sendMessage = mutation({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Sending message", args.prompt);

    const responseStreamId = await streamingComponent.createStream(ctx);

    console.log("Sending message", responseStreamId);

    const chatId = await ctx.db.insert("userMessages", {
      prompt: args.prompt,
      responseStreamId,
    });

    console.log("Chat ID", chatId);

    return chatId;
  },
});

// List conflict interview messages
export const listConflictMessages = query({
  args: {
    conflictId: v.id("conflicts"),
  },
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);

    // Verify user has access to this conflict
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

// Send conflict interview message
export const sendConflictMessage = mutation({
  args: {
    conflictId: v.id("conflicts"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);

    // Verify user has access to this conflict
    const conflict = await ctx.db.get(args.conflictId);
    if (!conflict || conflict.createdBy !== user._id) {
      throw new Error(
        "Access denied: You can only send messages to your own conflicts",
      );
    }

    const responseStreamId = await streamingComponent.createStream(ctx);

    const chatId = await ctx.db.insert("conflictMessages", {
      conflictId: args.conflictId,
      prompt: args.prompt,
      responseStreamId,
      userId: user._id,
      type: "interview",
    });

    // Update conflict status to interview when first message is sent
    if (conflict.status === "draft") {
      await ctx.db.patch(args.conflictId, {
        status: "interview",
        updatedAt: Date.now(),
      });
    }

    return chatId;
  },
});

// Get interview history for AI context
export const getInterviewHistory = internalQuery({
  args: {
    conflictId: v.id("conflicts"),
  },
  handler: async (ctx, args) => {
    // Get conflict details
    const conflict = await ctx.db.get(args.conflictId);
    if (!conflict) {
      throw new Error("Conflict not found");
    }

    // Get all interview messages for this conflict
    const allMessages = await ctx.db
      .query("conflictMessages")
      .withIndex("by_conflict", (q) => q.eq("conflictId", args.conflictId))
      .collect();

    // Join with AI responses
    const joinedResponses = await Promise.all(
      allMessages.map(async (userMessage) => {
        return {
          userMessage,
          responseMessage: await streamingComponent.getStreamBody(
            ctx,
            userMessage.responseStreamId as StreamId,
          ),
        };
      }),
    );

    return {
      conflict,
      messages: joinedResponses.flatMap((joined) => {
        const user = {
          role: "user" as const,
          content: joined.userMessage.prompt,
        };

        const assistant = {
          role: "assistant" as const,
          content: joined.responseMessage.text,
        };

        // If the assistant message is empty, its probably because we have not
        // started streaming yet so lets not include it in the history
        if (!assistant.content) return [user];

        return [user, assistant];
      }),
    };
  },
});

// Mark interview as completed
export const markInterviewCompleted = mutation({
  args: {
    conflictId: v.id("conflicts"),
  },
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);

    // Verify user has access to this conflict
    const conflict = await ctx.db.get(args.conflictId);
    if (!conflict || conflict.createdBy !== user._id) {
      throw new Error("Access denied: You can only update your own conflicts");
    }

    await ctx.db.patch(args.conflictId, {
      interviewCompleted: true,
      status: "in_progress",
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Internal version for AI completion - doesn't require user auth
export const markInterviewCompletedInternal = internalMutation({
  args: {
    conflictId: v.id("conflicts"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Get conflict to verify it exists
    const conflict = await ctx.db.get(args.conflictId);
    if (!conflict) {
      throw new Error("Conflict not found");
    }

    console.log("Marking interview as completed", args.conflictId);

    // Update conflict status
    await ctx.db.patch(args.conflictId, {
      interviewCompleted: true,
      status: "in_progress",
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Get conflict message by stream ID (for streaming)
export const getConflictMessageByStreamId = internalQuery({
  args: {
    streamId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conflictMessages")
      .withIndex("by_stream", (q) => q.eq("responseStreamId", args.streamId))
      .unique();
  },
});

export const getHistory = internalQuery({
  args: {},
  handler: async (ctx) => {
    // Grab all the user messages
    const allMessages = await ctx.db.query("userMessages").collect();

    // Lets join the user messages with the assistant messages
    const joinedResponses = await Promise.all(
      allMessages.map(async (userMessage) => {
        return {
          userMessage,
          responseMessage: await streamingComponent.getStreamBody(
            ctx,
            userMessage.responseStreamId as StreamId,
          ),
        };
      }),
    );

    return joinedResponses.flatMap((joined) => {
      const user = {
        role: "user" as const,
        content: joined.userMessage.prompt,
      };

      const assistant = {
        role: "assistant" as const,
        content: joined.responseMessage.text,
      };

      // If the assistant message is empty, its probably because we have not
      // started streaming yet so lets not include it in the history
      if (!assistant.content) return [user];

      return [user, assistant];
    });
  },
});
