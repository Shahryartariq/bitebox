import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { APICallError } from "ai";
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

export function chatModel() {
  const key = env.geminiKey;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  provider ??= createGoogleGenerativeAI({ apiKey: key });
  return provider(env.geminiModel);
}

type ThinkingLevel = "minimal" | "low";
export type ProviderOptions = { google: { thinkingConfig: { thinkingLevel: ThinkingLevel } } } | undefined;

/**
 * Gemini 3 models think before answering by default, which makes short JSON answers slow.
 * Ask for less thinking; if this model rejects the setting (HTTP 400), run the call again without it.
 */
export async function withLessThinking<T>(
  level: ThinkingLevel,
  run: (providerOptions: ProviderOptions) => Promise<T>,
): Promise<T> {
  try {
    return await run({ google: { thinkingConfig: { thinkingLevel: level } } });
  } catch (error) {
    if (APICallError.isInstance(error) && error.statusCode === 400) return run(undefined);
    throw error;
  }
}

/** Stop waiting when the visitor leaves or after `ms`, whichever comes first. */
export function deadline(request: Request, ms: number): AbortSignal {
  return AbortSignal.any([request.signal, AbortSignal.timeout(ms)]);
}

export function isTimeout(error: unknown): boolean {
  const e = error as { name?: string; cause?: { name?: string } };
  return e?.name === "TimeoutError" || e?.cause?.name === "TimeoutError";
}
