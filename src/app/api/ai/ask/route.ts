import { streamText } from "ai";
import { AI_OFF_MESSAGE, jsonError, limitResponse, readBody } from "@/lib/api";
import { mockAnswer } from "@/lib/ai/mock";
import { aiMode, chatModel, deadline, isBadRequest, isBusy, modelChain, type ProviderOptions } from "@/lib/ai/model";
import { KITCHEN_HELPER_SYSTEM, recipeContext } from "@/lib/ai/prompts";
import { resolveRecipe } from "@/lib/ai/resolve";
import { askRequest } from "@/lib/ai/schemas";
import { checkAiLimits } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 45;

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
    let lastError: unknown;
    const start = (modelId: string, providerOptions: ProviderOptions) =>
      streamText({
        model: chatModel(modelId),
        system: `${KITCHEN_HELPER_SYSTEM}\n\n${recipeContext(recipe)}`,
        messages: body.data.messages,
        maxOutputTokens: 700,
        temperature: 0.5,
        maxRetries: 0,
        providerOptions,
        abortSignal: deadline(request, 40_000),
        onError: ({ error }) => {
          lastError = error;
          console.error(`[ai/ask] ${modelId} stream error`, error);
        },
      }).textStream[Symbol.asyncIterator]();

    // Wait for the first words, so a failed call can move on to the next option instead of
    // returning an empty answer: less thinking first, then the model's default, then the backup model.
    let iterator: AsyncIterator<string> | undefined;
    let first: IteratorResult<string> | undefined;
    for (const modelId of modelChain()) {
      lastError = undefined;
      iterator = start(modelId, { google: { thinkingConfig: { thinkingLevel: "low" } } });
      first = await iterator.next();
      if (first.done && isBadRequest(lastError)) {
        lastError = undefined;
        iterator = start(modelId, undefined);
        first = await iterator.next();
      }
      if (!first.done && first.value) break;
      if (!isBusy(lastError)) break;
      console.warn(`[ai/ask] ${modelId} is busy, trying the next model`);
    }
    if (!iterator || !first || first.done || !first.value) {
      return jsonError(502, "The kitchen helper couldn't answer right now. Please try again.");
    }
    const reader = iterator;
    const opening = first.value;
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(opening));
      },
      async pull(controller) {
        try {
          const next = await reader.next();
          if (next.done) controller.close();
          else controller.enqueue(encoder.encode(next.value));
        } catch (error) {
          console.error("[ai/ask] stream failed", error);
          controller.close();
        }
      },
      async cancel() {
        await reader.return?.();
      },
    });
    return new Response(stream, { headers: STREAM_HEADERS });
  } catch (error) {
    console.error("[ai/ask] failed", error);
    return jsonError(502, "The kitchen helper couldn't answer right now. Please try again.");
  }
}
