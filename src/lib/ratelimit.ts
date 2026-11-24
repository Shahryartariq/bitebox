import "server-only";
import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { env } from "./env";

export interface LimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

interface Store {
  hit(key: string, windowSeconds: number): Promise<{ count: number; resetAt: number }>;
}

class MemoryStore implements Store {
  private buckets = new Map<string, { count: number; resetAt: number }>();

  async hit(key: string, windowSeconds: number) {
    const now = Date.now();
    if (this.buckets.size > 5000) {
      for (const [k, v] of this.buckets) if (v.resetAt <= now) this.buckets.delete(k);
    }
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + windowSeconds * 1000 };
      this.buckets.set(key, fresh);
      return fresh;
    }
    bucket.count += 1;
    return bucket;
  }
}

class PostgresStore implements Store {
  private sql;
  private ready: Promise<unknown> | undefined;

  constructor(url: string) {
    this.sql = neon(url);
  }

  private ensureTable() {
    this.ready ??= this.sql`
      CREATE TABLE IF NOT EXISTS bitebox_rate_limits (
        key text PRIMARY KEY,
        count integer NOT NULL,
        reset_at timestamptz NOT NULL
      )`.catch((error: unknown) => {
      this.ready = undefined;
      throw error;
    });
    return this.ready;
  }

  async hit(key: string, windowSeconds: number) {
    await this.ensureTable();
    const rows = (await this.sql`
      INSERT INTO bitebox_rate_limits (key, count, reset_at)
      VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN bitebox_rate_limits.reset_at <= now() THEN 1 ELSE bitebox_rate_limits.count + 1 END,
        reset_at = CASE WHEN bitebox_rate_limits.reset_at <= now() THEN EXCLUDED.reset_at ELSE bitebox_rate_limits.reset_at END
      RETURNING count, reset_at`) as Array<{ count: number; reset_at: string | Date }>;
    // Clear out old rows now and then.
    if (Math.random() < 0.01) {
      this.sql`DELETE FROM bitebox_rate_limits WHERE reset_at < now() - interval '1 day'`.catch(() => {});
    }
    const row = rows[0]!;
    return { count: Number(row.count), resetAt: new Date(row.reset_at).getTime() };
  }
}

const memory = new MemoryStore();
let postgres: PostgresStore | undefined;

function store(): Store {
  const url = env.databaseUrl;
  if (!url || env.sampleData) return memory;
  postgres ??= new PostgresStore(url);
  return postgres;
}

/** Count one request for `key`; refuse once more than `max` happen inside the window. */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<LimitResult> {
  let result: { count: number; resetAt: number };
  try {
    result = await store().hit(key, windowSeconds);
  } catch (error) {
    console.error("[ratelimit] shared store failed, using per-instance limits", error);
    result = await memory.hit(key, windowSeconds);
  }
  return { ok: result.count <= max, remaining: Math.max(0, max - result.count), resetAt: result.resetAt };
}

/** A visitor key that doesn't store the raw IP address. */
export function visitorKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = headers.get("x-real-ip")?.trim() || forwarded || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${ip}|${day}|bitebox`).digest("base64url").slice(0, 22);
}

export interface Limit {
  max: number;
  windowSeconds: number;
}

export const LIMITS = {
  ask: { max: 24, windowSeconds: 600 },
  substitute: { max: 30, windowSeconds: 600 },
  recipe: { max: 8, windowSeconds: 600 },
  import: { max: 20, windowSeconds: 600 },
} satisfies Record<string, Limit>;

/** Per-visitor limit plus a site-wide daily AI budget. */
export async function checkAiLimits(
  headers: Headers,
  kind: keyof typeof LIMITS,
): Promise<LimitResult & { reason?: "visitor" | "daily" }> {
  const limit = LIMITS[kind];
  const visitor = await rateLimit(`${kind}:${visitorKey(headers)}`, limit.max, limit.windowSeconds);
  if (!visitor.ok) return { ...visitor, reason: "visitor" };
  if (kind === "import") return visitor;
  const day = new Date().toISOString().slice(0, 10);
  const daily = await rateLimit(`ai-day:${day}`, env.aiDailyLimit, 60 * 60 * 26);
  if (!daily.ok) return { ...daily, reason: "daily" };
  return visitor;
}
