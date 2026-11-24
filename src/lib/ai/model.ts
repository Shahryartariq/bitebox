import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
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
