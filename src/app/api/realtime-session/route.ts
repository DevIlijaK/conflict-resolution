import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "convex/_generated/api";
import { type Id } from "convex/_generated/dataModel";
import { env } from "~/env";

const convex = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);

export async function POST(request: Request) {
  const { getToken, userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const conflictId = request.headers.get(
    "x-conflict-id",
  ) as Id<"conflicts"> | null;
  if (!conflictId) {
    return new Response("Missing x-conflict-id header", { status: 400 });
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    return new Response("Could not obtain auth token", { status: 401 });
  }

  convex.setAuth(token);

  let sessionConfig;
  try {
    sessionConfig = await convex.query(api.voice.getVoiceSessionConfig, {
      conflictId,
    });
  } catch {
    return new Response("Access denied or conflict not found", { status: 403 });
  }

  const sdp = await request.text();

  const form = new FormData();
  form.set("sdp", sdp);
  form.set(
    "session",
    JSON.stringify({
      type: "realtime",
      model: "gpt-realtime-1.5",
      instructions: sessionConfig.instructions,
      tools: sessionConfig.tools,
      tool_choice: "auto",
      audio: {
        output: { voice: "sage" },
        input: {
          transcription: { model: "whisper-1" },
        },
      },
    }),
  );

  const response = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("OpenAI Realtime session error:", response.status, body);
    return new Response("Failed to create realtime session", {
      status: response.status,
    });
  }

  const answerSdp = await response.text();
  return new Response(answerSdp, {
    headers: { "Content-Type": "application/sdp" },
  });
}
