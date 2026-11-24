import "server-only";
import type { z } from "zod";
import type { LimitResult } from "./ratelimit";

export function jsonError(status: number, error: string, headers?: HeadersInit): Response {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store", ...headers } });
}

/** Browsers always send Origin on POST; refuse requests made from other websites. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // server-to-server calls and old browsers; rate limits still apply
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readBody<S extends z.ZodType>(
  request: Request,
  schema: S,
  maxBytes = 24_000,
): Promise<{ ok: true; data: z.infer<S> } | { ok: false; response: Response }> {
  if (!isSameOrigin(request)) return { ok: false, response: jsonError(403, "Requests must come from Bitebox.") };
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) return { ok: false, response: jsonError(413, "That request is too large.") };
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return { ok: false, response: jsonError(400, "The request couldn't be read.") };
  }
  if (raw.length > maxBytes) return { ok: false, response: jsonError(413, "That request is too large.") };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, response: jsonError(400, "The request isn't valid JSON.") };
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, response: jsonError(400, first?.message ?? "The request is missing something.") };
  }
  return { ok: true, data: parsed.data };
}

export function limitResponse(result: LimitResult & { reason?: "visitor" | "daily" }): Response {
  const retry = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  const message =
    result.reason === "daily"
      ? "The kitchen helper has answered as many questions as it can today. Please try again tomorrow."
      : `You've asked a lot in a short time. Try again in ${retry < 90 ? `${retry} seconds` : `${Math.ceil(retry / 60)} minutes`}.`;
  return jsonError(429, message, { "retry-after": String(retry) });
}

export const AI_OFF_MESSAGE = "The AI kitchen helper isn't set up on this site yet.";
