import { httpAction } from "./_generated/server";
import { type StreamId } from "@convex-dev/persistent-text-streaming";
import { streamingComponent } from "./streaming";
import OpenAI from "openai";
import { internal } from "./_generated/api";
import { type Doc } from "./_generated/dataModel";

const openai = new OpenAI();

export const streamChat = httpAction(async (ctx, request) => {
  const body = (await request.json()) as {
    streamId: string;
  };

  // Start streaming and persisting at the same time while
  // we immediately return a streaming response to the client
  const response = await streamingComponent.stream(
    ctx,
    request,
    body.streamId as StreamId,
    async (ctx, request, streamId, append) => {
      const history = await ctx.runQuery(internal.messages.getHistory);

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that can answer questions and help with tasks.
            Please provide your response in markdown format.
            You are continuing a conversation. The conversation so far is found in the following JSON-formatted value:`,
          },
          ...history,
        ],
        stream: true,
      });
      for await (const part of stream) {
        await append(part.choices[0]?.delta?.content ?? "");
      }
    },
  );

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Vary", "Origin");

  return response;
});

// Conflict Interview Streaming - Focused on just the interview phase
export const streamConflictChat = httpAction(async (ctx, request) => {
  const body = (await request.json()) as {
    streamId: string;
  };

  const response = await streamingComponent.stream(
    ctx,
    request,
    body.streamId as StreamId,
    async (ctx, request, streamId, append) => {
      // Get the conflict message associated with this stream
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

      // Create interview-specific system prompt
      const systemPrompt = createInterviewPrompt(conflict);

      const stream = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          ...messages,
        ],
        stream: true,
      });

      for await (const part of stream) {
        await append(part.choices[0]?.delta?.content ?? "");
      }
    },
  );

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Vary", "Origin");

  return response;
});

// Dedicated Interview Prompt - Focused and refined
function createInterviewPrompt(conflict: Doc<"conflicts">): string {
  return `You are an empathetic AI conflict resolution assistant conducting an interview to understand a conflict situation.

**Conflict Context:**
- Title: "${conflict.title}"
- Description: "${conflict.description}"
- Started: ${new Date(conflict.createdAt).toLocaleDateString()}

**Your Role:**
You are here to help me understand this conflict by asking thoughtful, empathetic questions. Your goal is to gather key information about what happened, how it affected everyone involved, and what the person hopes to achieve.

**Interview Guidelines:**
- Be warm, professional, and non-judgmental
- Ask 3-5 targeted questions to understand the conflict deeply
- Ask ONE question at a time and wait for the response
- Focus on these key areas:
  1. **Timeline**: What happened and when?
  2. **Impact**: How did this affect you emotionally?
  3. **Perspective**: What do you think the other person's view might be?
  4. **Needs**: What's most important to you in resolving this?
  5. **Outcome**: What would a good resolution look like?

**Conversation Flow:**
- Start with a warm greeting if this is the first message
- Ask follow-up questions based on their responses
- Show understanding and validate their feelings
- When you have enough information (after 3-5 meaningful exchanges), let them know they can move to the next step

**Tone:**
- Empathetic and understanding
- Professional but warm
- Encouraging and supportive
- Never judgmental or taking sides

Remember: Your goal is to help them feel heard and to gather the information needed to help resolve their conflict constructively.`;
}
