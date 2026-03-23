import type OpenAI from "openai";

/** Chat history item in the shape the current streaming client expects. */
export type StreamingChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

/** Wire payload for a streamed completion request (OpenAI-compatible today). */
export type StreamingChatRequest = OpenAI.Chat.ChatCompletionCreateParamsStreaming;

/**
 * Reusable streaming chat setup: model, tools, and system prompt from domain context.
 * Add configs in `convex/ai/kinds/*.ts` and pass them to `buildStreamingChatRequest`.
 */
export type StreamingChatConfig<TContext> = {
  readonly model: string;
  readonly buildSystemPrompt: (ctx: TContext) => string;
  readonly tools: OpenAI.Chat.ChatCompletionTool[];
  readonly toolChoice?: OpenAI.Chat.ChatCompletionToolChoiceOption;
};

export function buildStreamingChatRequest<TContext>(
  config: StreamingChatConfig<TContext>,
  context: TContext,
  history: StreamingChatMessage[],
): StreamingChatRequest {
  return {
    model: config.model,
    messages: [
      { role: "system", content: config.buildSystemPrompt(context) },
      ...history,
    ],
    tools: config.tools,
    tool_choice: config.toolChoice ?? "auto",
    stream: true,
  };
}
