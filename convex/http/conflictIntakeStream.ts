import { httpAction } from "../_generated/server";
import { type StreamId } from "@convex-dev/persistent-text-streaming";
import { streamingComponent } from "../streaming";
import OpenAI from "openai";
import { internal } from "../_generated/api";
import {
  INTAKE_INTERVIEW_COMPLETE_TOOL,
  buildIntakeInterviewCompletionParams,
} from "../ai/kinds/intakeInterview";

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

      const stream = await openai.chat.completions.create(
        buildIntakeInterviewCompletionParams(conflict, messages),
      );

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
          if (pendingFunctionCall.name === INTAKE_INTERVIEW_COMPLETE_TOOL) {
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
        await ctx.runAction(internal.intake.summary.applyGeneratedSummary, {
          conflictId: conflictMessage.conflictId,
        });
      }
    },
  );

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Vary", "Origin");

  return response;
});
