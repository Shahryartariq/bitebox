import { generateText, Output } from "ai";
import { AI_OFF_MESSAGE, jsonError, limitResponse, readBody } from "@/lib/api";
import { mockRecipe } from "@/lib/ai/mock";
import { aiMode, chatModel } from "@/lib/ai/model";
import { RECIPE_SYSTEM, recipePrompt } from "@/lib/ai/prompts";
import { generatedRecipe, recipeRequest } from "@/lib/ai/schemas";
import { checkAiLimits } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  const body = await readBody(request, recipeRequest, 4_000);
  if (!body.ok) return body.response;

  const mode = aiMode();
  if (mode === "off") return jsonError(503, AI_OFF_MESSAGE);

  const limit = await checkAiLimits(request.headers, "recipe");
  if (!limit.ok) return limitResponse(limit);

  if (mode === "mock") {
    return Response.json(mockRecipe(body.data.prompt, body.data.have), { headers: { "cache-control": "no-store" } });
  }

  try {
    const { output } = await generateText({
      model: chatModel(),
      system: RECIPE_SYSTEM,
      prompt: recipePrompt(body.data.prompt, body.data.have),
      output: Output.object({ schema: generatedRecipe }),
      maxOutputTokens: 2200,
      temperature: 0.6,
      abortSignal: request.signal,
    });
    const checked = generatedRecipe.safeParse(output);
    if (!checked.success) return jsonError(502, "The recipe came back incomplete. Please try again.");
    return Response.json(checked.data, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("[ai/recipe] failed", error);
    return jsonError(502, "A recipe couldn't be written right now. Please try again.");
  }
}
