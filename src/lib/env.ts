import "server-only";

function flag(name: string): boolean {
  return process.env[name] === "1" || process.env[name] === "true";
}

function positiveInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export const env = {
  get sampleData() {
    return flag("BITEBOX_SAMPLE_DATA");
  },
  get aiMock() {
    return flag("BITEBOX_AI_MOCK");
  },
  get geminiKey() {
    return process.env.GEMINI_API_KEY?.trim() || undefined;
  },
  get geminiModel() {
    return process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  },
  /** Used when Google says the main model is busy. */
  get geminiFallbackModel() {
    return process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-flash-latest";
  },
  get mealdbKey() {
    const key = process.env.MEALDB_API_KEY?.trim();
    return key && /^[A-Za-z0-9]+$/.test(key) ? key : "1";
  },
  get databaseUrl() {
    return process.env.DATABASE_URL?.trim() || undefined;
  },
  get aiDailyLimit() {
    return positiveInt("AI_DAILY_LIMIT", 1500);
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
