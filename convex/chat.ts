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

// Conflict Interview Streaming - Simplified autonomous completion
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

      // Create interview prompt
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
        tools: [
          {
            type: "function",
            function: {
              name: "complete_interview",
              description:
                "Call this function when the interview is complete and ready to proceed to the next phase",
              parameters: {
                type: "object",
                properties: {
                  completion_message: {
                    type: "string",
                    description:
                      "A final message to show the user indicating the interview is complete",
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
        // Handle regular content
        if (part.choices[0]?.delta?.content) {
          const content = part.choices[0].delta.content;
          await append(content);
        }

        // Handle function calls - they come in chunks during streaming
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

        // Check if this is the completion of the stream
        if (part.choices[0]?.finish_reason === "tool_calls") {
          // Process the completed function call
          if (pendingFunctionCall.name === "complete_interview") {
            interviewCompleted = true;

            // Parse the completion message and append it to the stream
            try {
              const args = JSON.parse(pendingFunctionCall.arguments ?? "{}");
              if (args.completion_message) {
                await append(args.completion_message);
              }
            } catch (e) {
              console.error("Error parsing function arguments:", e);
            }
          }
          break; // Exit the loop when function call is complete
        }
      }

      // Mark interview as completed if the AI called the function
      if (interviewCompleted) {
        console.log("Marking interview as completed");
        await ctx.runMutation(internal.messages.updateConflictInternal, {
          conflictId: conflictMessage.conflictId,
          updates: {
            status: "in_progress",
          },
        });
      }
    },
  );

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Vary", "Origin");

  return response;
});

// Simplified interview prompt
function createInterviewPrompt(conflict: Doc<"conflicts">): string {
  return `You are an AI conflict resolution assistant conducting a focused initial interview to understand the basic facts of a conflict situation.

**Conflict Context:**
- Title: "${conflict.title}"
- Description: "${conflict.description}"

**Your Role:**
This is PHASE 1 of the interview process. Your ONLY goal is to gather the basic factual information about what happened in this conflict. Do NOT ask about emotions, feelings, or desired outcomes - that comes in Phase 2.

**Important:** The user has already described their conflict situation above. Build on what they've shared rather than asking them to repeat it. Reference the specific conflict they mentioned.

**Interview Process - PHASE 1 (Conflict Description):**
You have a MAXIMUM of 3-4 questions to understand the basic facts:

1. **Essential Questions to Ask (choose only the most relevant, building on what they've already shared):**
   - Can you walk me through the specific sequence of events in the conflict situation you described?
   - When did this particular conflict happen?
   - Were there any other people involved in this specific conflict?
   - Where did this conflict take place?

2. **Strict Guidelines:**
   - Ask ONLY ONE question at a time
   - Maximum 3-4 questions total before completion
   - Focus ONLY on factual information about the conflict
   - Do NOT ask about emotions, feelings, or impact
   - Do NOT ask about desired outcomes or resolutions
   - Do NOT ask about relationships or perspectives

3. **Completion:**
   After you have asked your 3-4 questions and received answers about the basic facts of what happened, call the "complete_interview" function with a friendly completion message for the user (like "Thank you for providing those details. I now have a good understanding of the situation and we're ready to move to the next phase of the process.").

**Tone:**
- Professional and focused
- Factual and direct
- Empathetic but not emotional
- Efficient and structured

Remember: This is ONLY Phase 1. Keep it rigorous, focused, and factual. Emotional impact and resolution discussions happen in Phase 2.`;
}
