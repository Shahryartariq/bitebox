import { streamText } from "ai";
import { AI_OFF_MESSAGE, jsonError, limitResponse, readBody } from "@/lib/api";
import { mockAnswer } from "@/lib/ai/mock";
import { aiMode, chatModel } from "@/lib/ai/model";
import { KITCHEN_HELPER_SYSTEM, recipeContext } from "@/lib/ai/prompts";
import { resolveRecipe } from "@/lib/ai/resolve";
import { askRequest } from "@/lib/ai/schemas";
import { checkAiLimits } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

const STREAM_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function streamMock(text: string): Response {
  const encoder = new TextEncoder();
  const words = text.split(/(?<=\s)/);
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const word of words) {
        controller.enqueue(encoder.encode(word));
        await new Promise((r) => setTimeout(r, 8));
      }
      controller.close();
    },
  });
  return new Response(stream, { headers: STREAM_HEADERS });
}

export async function POST(request: Request) {
  const body = await readBody(request, askRequest);
  if (!body.ok) return body.response;

  const mode = aiMode();
  if (mode === "off") return jsonError(503, AI_OFF_MESSAGE);

  const limit = await checkAiLimits(request.headers, "ask");
  if (!limit.ok) return limitResponse(limit);

  const recipe = await resolveRecipe(body.data.recipe);
  if (!recipe) return jsonError(404, "That recipe couldn't be loaded. Reload the page and try again.");

  const question = body.data.messages[body.data.messages.length - 1]!.content;
  if (mode === "mock") return streamMock(mockAnswer(question, recipe.title));

  try {
    const result = streamText({
      model: chatModel(),
      system: `${KITCHEN_HELPER_SYSTEM}\n\n${recipeContext(recipe)}`,
      messages: body.data.messages,
      maxOutputTokens: 700,
      temperature: 0.5,
      abortSignal: request.signal,
      onError: ({ error }) => console.error("[ai/ask] stream error", error),
    });
    // Wait for the first words so a failed model call becomes a proper error, not an empty 200.
    const iterator = result.textStream[Symbol.asyncIterator]();
    const first = await iterator.next();
    if (first.done || !first.value) {
      return jsonError(502, "The kitchen helper couldn't answer right now. Please try again.");
    }
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(first.value));
      },
      async pull(controller) {
        try {
          const next = await iterator.next();
          if (next.done) controller.close();
          else controller.enqueue(encoder.encode(next.value));
        } catch (error) {
          console.error("[ai/ask] stream failed", error);
          controller.close();
        }
      },
      async cancel() {
        await iterator.return?.();
      },
    });
    return new Response(stream, { headers: STREAM_HEADERS });
  } catch (error) {
    console.error("[ai/ask] failed", error);
    return jsonError(502, "The kitchen helper couldn't answer right now. Please try again.");
  }
}
