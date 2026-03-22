import { httpAction } from "./_generated/server";
import { type StreamId } from "@convex-dev/persistent-text-streaming";
import { streamingComponent } from "./streaming";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { type Doc } from "./_generated/dataModel";
import { PENDING_INTAKE_TITLE } from "./intakeConstants";

const openai = new OpenAI();

export const streamConflictChat = httpAction(async (ctx, request) => {
  const body = (await request.json()) as {
    streamId: string;
  };

  const response = await streamingComponent.stream(
    ctx,
    request,
    body.streamId as StreamId,
    async (ctx, request, streamId, append) => {
      const conflictMessage = await ctx.runQuery(
        internal.messages.getConflictMessageByStreamId,
        {
          streamId: streamId,
        },
      );

      if (!conflictMessage) {
        throw new Error("Conflict message not found");
      }

      const { conflict, messages } = await ctx.runQuery(
        internal.messages.getInterviewHistory,
        { conflictId: conflictMessage.conflictId },
      );

      const systemPrompt = createIntakePrompt(conflict);

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...messages,
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "complete_interview",
              description:
                "Call when you have learned enough about the conflict from this conversation to produce an accurate factual record. This closes the chat and triggers a separate system to write a detailed title and summary from the full history.",
              parameters: {
                type: "object",
                properties: {
                  completion_message: {
                    type: "string",
                    description:
                      "Brief warm closing line to the user (one or two sentences). Do not promise specific next product steps.",
                  },
                },
                required: ["completion_message"],
              },
            },
          },
        ],
        tool_choice: "auto",
        stream: true,
      });

      let interviewCompleted = false;
      const pendingFunctionCall = {
        name: "",
        arguments: "",
      };

      for await (const part of stream) {
        if (part.choices[0]?.delta?.content) {
          const content = part.choices[0].delta.content;
          await append(content);
        }

        if (part.choices[0]?.delta?.tool_calls) {
          const toolCalls = part.choices[0].delta.tool_calls;
          for (const toolCall of toolCalls) {
            if (toolCall.function?.name) {
              pendingFunctionCall.name = toolCall.function.name;
            }
            if (toolCall.function?.arguments) {
              pendingFunctionCall.arguments += toolCall.function.arguments;
            }
          }
        }

        if (part.choices[0]?.finish_reason === "tool_calls") {
          if (pendingFunctionCall.name === "complete_interview") {
            interviewCompleted = true;

            try {
              const fnArgs = JSON.parse(pendingFunctionCall.arguments ?? "{}");
              if (fnArgs.completion_message) {
                await append(fnArgs.completion_message);
              }
            } catch (e) {
              console.error("Error parsing function arguments:", e);
            }
          }
          break;
        }
      }

      if (interviewCompleted) {
        await ctx.runMutation(internal.messages.updateConflictInternal, {
          conflictId: conflictMessage.conflictId,
          updates: {
            status: "in_progress",
          },
        });
        await ctx.runAction(internal.intakeSummary.applyGeneratedSummary, {
          conflictId: conflictMessage.conflictId,
        });
      }
    },
  );

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Vary", "Origin");

  return response;
});

function createIntakePrompt(conflict: Doc<"conflicts">): string {
  const noPresetSummary =
    conflict.title === PENDING_INTAKE_TITLE && !conflict.description.trim();

  const contextBlock = noPresetSummary
    ? `**Context:** There is no pre-written summary. Everything you learn must come from this chat. Open by inviting them to describe what happened and who is involved.`
    : `**Starting context (may be partial):**
- Title: "${conflict.title}"
- Notes: "${conflict.description}"
Use this only as hints; verify and deepen through questions.`;

  return `You are a neutral fact-gathering intake assistant for conflict documentation. You are NOT a coach, therapist, or mediator in this phase.

${contextBlock}

**Your ONLY job:** Build an accurate factual record—who was involved, what happened in what order, what was said or done (as concretely as they can recall), where and when, and what is factually disputed or unclear. Someone else will later decide goals, process, or advice.

**STRICT rules—do NOT:**
- Ask what they want to happen, whether they hope to repair a relationship, or if they prefer "fixing things" vs "processing feelings" or any similar fork.
- Suggest how they should talk to someone, what might make a conversation easier, or what they "could try."
- Offer opinions, reassurance that steers them ("that's understandable to want to fix things"), or any implied recommendation.
- Ask about future intentions, readiness to reconcile, or therapeutic outcomes—only past/present observable facts.
- Frame questions as choices between strategies, values, or paths (e.g. "Are you more focused on X or Y?").

**DO:**
- Ask ONE short, neutral question at a time. A brief acknowledgment is fine ("Thanks," "Got it")—no coaching language.
- Drill into facts: exact words, actions, sequence, who was present, messages/calls/meetings if relevant, and what each side claims if they know.
- If they give a vague label ("we fought"), ask what specifically was said or done.
- If they already stated a wish (e.g. "I want to fix it"), note it as their words only—do not build follow-up questions around goals; stay on what happened and the factual situation now (e.g. "Have you had any contact since?" as fact, not "how to reconnect").

**When you are done:**
- Call complete_interview only when the factual picture is solid enough for another system to summarize without re-interviewing them.
- completion_message: one short neutral line (e.g. thank them for the detail). No next steps, no "good luck repairing," no process promises.

**Tone:** Calm, neutral, like a careful intake clerk or court reporter—curious about facts only.`;
}
