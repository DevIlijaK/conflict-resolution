import type OpenAI from "openai";
import { type Doc } from "../../_generated/dataModel";
import { buildIntakeInterviewSystemPrompt } from "../prompts/intakeInterview";
import {
  buildStreamingChatRequest,
  type StreamingChatConfig,
  type StreamingChatMessage,
} from "../streamingChat";

/** Tool name the stream handler checks to close intake and run summary. */
export const INTAKE_INTERVIEW_COMPLETE_TOOL = "complete_interview" as const;

export const intakeInterviewChatConfig: StreamingChatConfig<
  Doc<"conflicts">
> = {
  model: "gpt-4.1-mini",
  buildSystemPrompt: buildIntakeInterviewSystemPrompt,
  tools: [
    {
      type: "function" as const,
      function: {
        name: INTAKE_INTERVIEW_COMPLETE_TOOL,
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
  toolChoice: "auto" as const,
};

/** OpenAI params for the conflict intake (streaming) completion. */
export function buildIntakeInterviewCompletionParams(
  conflict: Doc<"conflicts">,
  history: StreamingChatMessage[],
): OpenAI.Chat.ChatCompletionCreateParamsStreaming {
  return buildStreamingChatRequest(
    intakeInterviewChatConfig,
    conflict,
    history,
  );
}
