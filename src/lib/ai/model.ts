import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { APICallError, RetryError } from "ai";
import { env } from "../env";

export type AiMode = "live" | "mock" | "off";

/**
 * "live" with a Gemini key, "mock" for tests and keyless local development,
 * and "off" in production without a key (the UI explains that AI isn't set up).
 */
export function aiMode(): AiMode {
  if (env.aiMock) return "mock";
  if (env.geminiKey) return "live";
  return env.isProduction ? "off" : "mock";
}

let provider: ReturnType<typeof createGoogleGenerativeAI> | undefined;

export function chatModel(modelId = env.geminiModel) {
  const key = env.geminiKey;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  provider ??= createGoogleGenerativeAI({ apiKey: key });
  return provider(modelId);
}

/** The main model first, then a backup for when Google says the main one is busy. */
export function modelChain(): string[] {
  return [...new Set([env.geminiModel, env.geminiFallbackModel])];
}

/** Google answers 503/429 ("high demand") when a model is overloaded; another model usually still works. */
export function isBusy(error: unknown): boolean {
  const e = RetryError.isInstance(error) ? error.lastError : error;
  if (!APICallError.isInstance(e)) return false;
  return (
    e.statusCode === 503 || e.statusCode === 429 || e.statusCode === 500 || /high demand|overloaded/i.test(e.message)
  );
}

export function isBadRequest(error: unknown): boolean {
  const e = RetryError.isInstance(error) ? error.lastError : error;
  return APICallError.isInstance(e) && e.statusCode === 400;
}

type ThinkingLevel = "minimal" | "low";
export type ProviderOptions = { google: { thinkingConfig: { thinkingLevel: ThinkingLevel } } } | undefined;

/**
 * Run a model call that should be quick. Gemini 3 models think before answering by default, which
 * makes short JSON answers slow, so ask for less thinking (and drop that setting if a model rejects
 * it with HTTP 400). If Google says a model is busy, try the backup model.
 */
export async function runQuick<T>(
  level: ThinkingLevel,
  run: (model: ReturnType<typeof chatModel>, providerOptions: ProviderOptions) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (const id of modelChain()) {
    try {
      try {
        return await run(chatModel(id), { google: { thinkingConfig: { thinkingLevel: level } } });
      } catch (error) {
        if (!isBadRequest(error)) throw error;
        return await run(chatModel(id), undefined);
      }
    } catch (error) {
      lastError = error;
      if (!isBusy(error)) throw error;
      console.warn(`[ai] ${id} is busy, trying the next model`);
    }
  }
  throw lastError;
}

/** Stop waiting when the visitor leaves or after `ms`, whichever comes first. */
export function deadline(request: Request, ms: number): AbortSignal {
  return AbortSignal.any([request.signal, AbortSignal.timeout(ms)]);
}

export function isTimeout(error: unknown): boolean {
  const e = error as { name?: string; cause?: { name?: string } };
  return e?.name === "TimeoutError" || e?.cause?.name === "TimeoutError";
}
