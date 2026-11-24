import "server-only";
import { lookup } from "node:dns";
import type { LookupAddress } from "node:dns";
import { isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";
import { isBlockedAddress } from "./ip";

export class ImportError extends Error {
  constructor(
    public readonly code:
      "invalid-url" | "blocked-address" | "timeout" | "too-large" | "not-html" | "http-error" | "network",
    message: string,
  ) {
    super(message);
    this.name = "ImportError";
  }
}

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 9_000;
export const IMPORT_USER_AGENT =
  "Mozilla/5.0 (compatible; BiteboxRecipeImporter/1.0; +https://github.com/Shahryartariq/bitebox)";

/** Only public http(s) URLs on the default ports, without credentials. */
export function validateUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ImportError("invalid-url", "That doesn't look like a web address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ImportError("invalid-url", "Only http and https links can be imported.");
  }
  if (url.username || url.password)
    throw new ImportError("invalid-url", "Links with a username or password can't be imported.");
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new ImportError("invalid-url", "Links to unusual ports can't be imported.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host.includes(".") && !isIP(host))
    throw new ImportError("blocked-address", "That address isn't on the public internet.");
  if (/\.(local|localhost|internal|lan|home|corp|intranet)$/i.test(host) || host === "localhost") {
    throw new ImportError("blocked-address", "That address isn't on the public internet.");
  }
  if (isIP(host) && isBlockedAddress(host)) {
    throw new ImportError("blocked-address", "That address isn't on the public internet.");
  }
  return url;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * DNS lookup that refuses private addresses. It runs at connect time, so a hostname that
 * resolves to a public address during validation can't switch to a private one afterwards.
 */
function guardedLookup(hostname: string, options: object, callback: LookupCallback) {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, []);
    const list = (addresses as LookupAddress[]).filter((a) => !isBlockedAddress(a.address));
    if (!list.length) {
      const blocked = new Error("Blocked address") as NodeJS.ErrnoException;
      blocked.code = "EBLOCKED";
      return callback(blocked, []);
    }
    if ((options as { all?: boolean }).all) return callback(null, list);
    return callback(null, list[0]!.address, list[0]!.family);
  });
}

const agent = new Agent({
  connect: { lookup: guardedLookup as never, timeout: 5_000 },
  headersTimeout: TIMEOUT_MS,
  bodyTimeout: TIMEOUT_MS,
});

export interface FetchedPage {
  url: string;
  html: string;
}

/** Fetch a public web page, following a few redirects, with size and time limits. */
export async function fetchPublicPage(raw: string): Promise<FetchedPage> {
  let url = validateUrl(raw);
  const deadline = AbortSignal.timeout(TIMEOUT_MS);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let res: Awaited<ReturnType<typeof undiciFetch>>;
    try {
      res = await undiciFetch(url, {
        dispatcher: agent,
        redirect: "manual",
        signal: deadline,
        headers: {
          "user-agent": IMPORT_USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "accept-language": "en;q=0.9",
        },
      });
    } catch (error) {
      const cause = (error as { cause?: { code?: string } }).cause;
      if (cause?.code === "EBLOCKED")
        throw new ImportError("blocked-address", "That address isn't on the public internet.");
      if ((error as Error).name === "TimeoutError" || (error as Error).name === "AbortError") {
        throw new ImportError("timeout", "The page took too long to load.");
      }
      throw new ImportError("network", "The page couldn't be reached.");
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel();
      if (!location) throw new ImportError("http-error", "The page redirected without saying where to.");
      url = validateUrl(new URL(location, url).toString());
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new ImportError(
        "http-error",
        res.status === 403 || res.status === 401
          ? "That site doesn't let other apps read its pages."
          : `The site answered with an error (HTTP ${res.status}).`,
      );
    }
    const type = res.headers.get("content-type") ?? "";
    if (type && !/text\/html|application\/xhtml\+xml/i.test(type)) {
      await res.body?.cancel();
      throw new ImportError("not-html", "That link isn't a web page.");
    }
    const declared = Number(res.headers.get("content-length"));
    if (declared > MAX_BYTES) {
      await res.body?.cancel();
      throw new ImportError("too-large", "That page is too large to import.");
    }

    const reader = res.body?.getReader();
    if (!reader) return { url: url.toString(), html: "" };
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new ImportError("too-large", "That page is too large to import.");
      }
      chunks.push(value);
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
    return { url: url.toString(), html };
  }
  throw new ImportError("http-error", "The page redirected too many times.");
}
