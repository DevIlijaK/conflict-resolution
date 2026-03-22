import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import {
  INTAKE_SUMMARY_JSON_SCHEMA,
  intakeSummarySchema,
} from "./intakeSummarySchema";

const openai = new OpenAI();

export const applyGeneratedSummary = internalAction({
  args: { conflictId: v.id("conflicts") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { conflict, messages } = await ctx.runQuery(
      internal.messages.getInterviewHistory,
      { conflictId: args.conflictId },
    );

    if (!conflict) {
      return null;
    }

    const transcript = messages
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n\n");

    if (!transcript.trim()) {
      return null;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: `You are a separate analyst from the intake interviewer. You ONLY see the transcript below—no live user.

Produce JSON matching the schema. This output is critical for later mediation steps.

- title: short, specific (≤12 words).
- description: a long, detailed, neutral factual dossier in third person. Include: everyone involved and how they relate; chronological events; what is agreed vs disputed; important statements, messages, or meetings if mentioned; current situation; gaps or uncertainties. Be thorough—downstream systems will rely on this and will not have access to the raw chat. No advice, no therapy, no taking sides.`,
        },
        {
          role: "user",
          content: transcript.slice(0, 120_000),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "intake_summary",
          description:
            "Title plus detailed factual conflict summary derived only from the transcript.",
          strict: true,
          schema: INTAKE_SUMMARY_JSON_SCHEMA,
        },
      },
    });

    const raw = response.choices[0]?.message?.content;

    if (!raw) {
      return null;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      return null;
    }

    const parsed = intakeSummarySchema.safeParse(parsedJson);
    if (!parsed.success) {
      return null;
    }

    const title = parsed.data.title.trim().slice(0, 200);
    const description = parsed.data.description.trim().slice(0, 32_000);

    await ctx.runMutation(internal.messages.updateConflictInternal, {
      conflictId: args.conflictId,
      updates: {
        title,
        description,
        intakeStepDone: true,
      },
    });

    return null;
  },
});
