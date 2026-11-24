/** Lowercase, strip accents and punctuation, collapse spaces. */
export function normalize(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function slugify(input: string): string {
  return normalize(input).replace(/\s+/g, "-").slice(0, 80) || "recipe";
}

/** Very small English singularizer, good enough to match "tomatoes" with "tomato". */
export function singular(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(oes|ches|shes|sses|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss") && !word.endsWith("us")) return word.slice(0, -1);
  return word;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "the",
  "of",
  "with",
  "in",
  "on",
  "for",
  "to",
  "or",
  "my",
  "some",
  "recipe",
  "recipes",
  "how",
  "make",
  "easy",
  "best",
  "quick",
]);

export function tokens(input: string): string[] {
  return normalize(input)
    .split(" ")
    .filter((t) => t && !STOP_WORDS.has(t))
    .map(singular);
}

/** True when the text looks like a web address the user pasted. */
export function looksLikeUrl(input: string): boolean {
  const value = input.trim();
  if (/\s/.test(value)) return false;
  return /^https?:\/\//i.test(value) || /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+\/\S*/i.test(value);
}

export function toUrl(input: string): string {
  const value = input.trim();
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/** Decode the HTML entities that show up in recipe text from web pages. */
export function decodeEntities(input: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
    frac12: "½",
    frac14: "¼",
    frac34: "¾",
    deg: "°",
    ndash: "–",
    mdash: "—",
    rsquo: "’",
    lsquo: "‘",
    rdquo: "”",
    ldquo: "“",
    hellip: "…",
    eacute: "é",
    egrave: "è",
    ccedil: "ç",
    ntilde: "ñ",
    uuml: "ü",
    ouml: "ö",
    auml: "ä",
    times: "×",
  };
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+[0-9]*);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return named[code.toLowerCase()] ?? match;
  });
}

/** Strip tags and decode entities; collapse whitespace. */
export function plainText(input: string): string {
  return decodeEntities(input.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, " "))
    .replace(/[ \t ]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** "PT1H20M" → "1 hr 20 min". Returns undefined for anything it can't read. */
export function formatDuration(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+(?:\.\d+)?S)?)?$/i.exec(iso.trim());
  if (!m) return undefined;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0) + days * 24;
  const minutes = Number(m[3] ?? 0);
  const totalMinutes = hours * 60 + minutes;
  if (totalMinutes <= 0) return undefined;
  const h = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;
  return [h ? `${h} hr` : "", min ? `${min} min` : ""].filter(Boolean).join(" ");
}

export function truncate(input: string, max: number): string {
  return input.length <= max ? input : `${input.slice(0, max - 1).trimEnd()}…`;
}
