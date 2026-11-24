import { generateText, Output } from "ai";
import { AI_OFF_MESSAGE, jsonError, limitResponse, readBody } from "@/lib/api";
import { mockSubstitute } from "@/lib/ai/mock";
import { aiMode, deadline, isTimeout, runQuick } from "@/lib/ai/model";
import { SUBSTITUTE_SYSTEM, substitutePrompt } from "@/lib/ai/prompts";
import { resolveRecipe } from "@/lib/ai/resolve";
import { substituteRequest, substituteResult } from "@/lib/ai/schemas";
import { checkAiLimits } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  const body = await readBody(request, substituteRequest);
  if (!body.ok) return body.response;

  const mode = aiMode();
  if (mode === "off") return jsonError(503, AI_OFF_MESSAGE);

  const limit = await checkAiLimits(request.headers, "substitute");
  if (!limit.ok) return limitResponse(limit);

  const recipe = await resolveRecipe(body.data.recipe);
  if (!recipe) return jsonError(404, "That recipe couldn't be loaded. Reload the page and try again.");

  if (mode === "mock") {
    return Response.json(mockSubstitute(body.data.ingredient.name), { headers: { "cache-control": "no-store" } });
  }

  try {
    const signal = deadline(request, 30_000);
    const { output } = await runQuick("minimal", (model, providerOptions) =>
      generateText({
        model,
        system: SUBSTITUTE_SYSTEM,
        prompt: substitutePrompt(recipe, body.data.ingredient),
        output: Output.object({ schema: substituteResult }),
        maxOutputTokens: 1200,
        temperature: 0.4,
        maxRetries: 0,
        providerOptions,
        abortSignal: signal,
      }),
    );
    const checked = substituteResult.safeParse(output);
    if (!checked.success) return jsonError(502, "The swap suggestions came back incomplete. Please try again.");
    return Response.json(checked.data, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (isTimeout(error)) return jsonError(504, "Swaps took too long this time. Please try again.");
    console.error("[ai/substitute] failed", error);
    return jsonError(502, "Swaps couldn't be loaded right now. Please try again.");
  }
}
