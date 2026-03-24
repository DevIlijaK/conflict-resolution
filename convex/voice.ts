import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { mustGetCurrentUser } from "./users";
import { buildIntakeInterviewSystemPrompt } from "./ai/prompts/intakeInterview";
import { streamingComponent } from "./streaming";
import { type StreamId } from "@convex-dev/persistent-text-streaming";
import { internal } from "./_generated/api";
import { INTAKE_INTERVIEW_COMPLETE_TOOL } from "./ai/kinds/intakeInterview";

/**
 * Tools in the OpenAI Realtime API format (different from Chat Completions —
 * no nested `function` wrapper).
 */
const REALTIME_TOOLS = [
  {
    type: "function" as const,
    name: INTAKE_INTERVIEW_COMPLETE_TOOL,
    description:
      "Call when you have learned enough about the conflict from this conversation to produce an accurate factual record. This closes the chat and triggers a separate system to write a detailed title and summary from the full history.",
    parameters: {
      type: "object" as const,
      properties: {
        completion_message: {
          type: "string" as const,
          description:
            "Brief warm closing line to the user (one or two sentences). Do not promise specific next product steps.",
        },
      },
      required: ["completion_message"],
    },
  },
];

export const getVoiceSessionConfig = query({
  args: { conflictId: v.id("conflicts") },
  returns: v.object({
    instructions: v.string(),
    tools: v.array(v.any()),
  }),
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const conflict = await ctx.db.get(args.conflictId);
    if (!conflict || conflict.createdBy !== user._id) {
      throw new Error("Access denied");
    }

    let instructions = buildIntakeInterviewSystemPrompt(conflict);

    const allMessages = await ctx.db
      .query("conflictMessages")
      .withIndex("by_conflict", (q) => q.eq("conflictId", args.conflictId))
      .collect();

    if (allMessages.length > 0) {
      const exchanges = await Promise.all(
        allMessages.map(async (msg) => {
          const response = msg.responseStreamId
            ? (await streamingComponent.getStreamBody(ctx, msg.responseStreamId as StreamId)).text
            : (msg.responseText ?? "");
          return { prompt: msg.prompt, response };
        }),
      );

      const historyText = exchanges
        .map((e) => {
          let block = `USER: ${e.prompt}`;
          if (e.response) block += `\nASSISTANT: ${e.response}`;
          return block;
        })
        .join("\n\n");

      instructions +=
        `\n\n**Previous interview exchanges (conducted via text):**\n${historyText}` +
        `\n\nContinue from where this left off. Do not re-ask questions that have already been answered.`;
    }

    instructions +=
      `\n\n**Language:** Always speak and respond in Serbian (srpski jezik). ` +
      `When the session starts, introduce yourself briefly: explain that you are here to help document the details of their conflict, ` +
      `that you will ask questions one at a time, and that everything they share stays in their record. Then ask your first question.` +
      `\n\n**TESTING MODE — REMOVE BEFORE PRODUCTION:** After exactly 2 user messages (exchanges), immediately call the ${INTAKE_INTERVIEW_COMPLETE_TOOL} tool to end the interview. Do not wait for more information — this is for testing purposes.`;

    return { instructions, tools: REALTIME_TOOLS };
  },
});

export const saveVoiceTranscript = mutation({
  args: {
    conflictId: v.id("conflicts"),
    exchanges: v.array(
      v.object({ userText: v.string(), assistantText: v.string() }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const conflict = await ctx.db.get(args.conflictId);
    if (!conflict || conflict.createdBy !== user._id) {
      throw new Error("Access denied");
    }

    for (const exchange of args.exchanges) {
      await ctx.db.insert("conflictMessages", {
        conflictId: args.conflictId,
        prompt: exchange.userText,
        responseText: exchange.assistantText,
        userId: user._id,
        type: "interview",
      });
    }

    return null;
  },
});

export const completeVoiceInterview = mutation({
  args: { conflictId: v.id("conflicts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await mustGetCurrentUser(ctx);
    const conflict = await ctx.db.get(args.conflictId);
    if (!conflict || conflict.createdBy !== user._id) {
      throw new Error("Access denied");
    }

    if (conflict.intakeStepDone === true || conflict.status === "in_progress") {
      return null;
    }

    await ctx.db.patch(args.conflictId, {
      status: "in_progress",
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.intake.summary.applyGeneratedSummary,
      { conflictId: args.conflictId },
    );

    return null;
  },
});
