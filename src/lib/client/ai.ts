"use client";

import type { GeneratedRecipe, RecipeRef, SubstituteResult } from "../ai/schemas";
import type { Ingredient } from "../types";

export class AiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

async function errorFrom(res: Response): Promise<AiError> {
  let message = "Something went wrong. Please try again.";
  try {
    const data = (await res.json()) as { error?: string };
    if (data.error) message = data.error;
  } catch {
    /* not JSON */
  }
  return new AiError(message, res.status);
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Stream an answer; `onText` gets the whole answer so far each time more arrives. */
export async function askKitchenHelper(
  recipe: RecipeRef,
  messages: ChatMessage[],
  onText: (text: string) => void,
  signal: AbortSignal,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ recipe, messages }),
      signal,
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new AiError("You seem to be offline. Check your connection and try again.", 0);
  }
  if (!res.ok || !res.body) throw await errorFrom(res);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }
  text += decoder.decode();
  if (!text.trim()) throw new AiError("The kitchen helper didn't answer. Please try again.", 502);
  onText(text);
  return text;
}

export async function fetchSubstitutes(
  recipe: RecipeRef,
  ingredient: Ingredient,
  signal?: AbortSignal,
): Promise<SubstituteResult> {
  const res = await fetch("/api/ai/substitute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      recipe,
      ingredient: { measure: ingredient.measure.slice(0, 60), name: ingredient.name.slice(0, 100) },
    }),
    signal,
  }).catch((error: Error) => {
    if (error.name === "AbortError") throw error;
    throw new AiError("You seem to be offline. Check your connection and try again.", 0);
  });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()) as SubstituteResult;
}

export async function fetchAiRecipe(
  prompt: string,
  have: string[] | undefined,
  signal?: AbortSignal,
): Promise<GeneratedRecipe> {
  const res = await fetch("/api/ai/recipe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt, have: have?.length ? have : undefined }),
    signal,
  }).catch((error: Error) => {
    if (error.name === "AbortError") throw error;
    throw new AiError("You seem to be offline. Check your connection and try again.", 0);
  });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()) as GeneratedRecipe;
}
