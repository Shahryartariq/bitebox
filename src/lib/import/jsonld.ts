import { parseIngredientLine } from "../ingredients";
import { decodeEntities, formatDuration, hostname, plainText } from "../text";
import type { Recipe } from "../types";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const isObject = (v: Json | undefined): v is JsonObject => typeof v === "object" && v !== null && !Array.isArray(v);

function hasType(node: JsonObject, type: string): boolean {
  const t = node["@type"];
  if (typeof t === "string")
    return t.toLowerCase() === type.toLowerCase() || t.toLowerCase().endsWith(`/${type.toLowerCase()}`);
  if (Array.isArray(t)) return t.some((x) => typeof x === "string" && x.toLowerCase() === type.toLowerCase());
  return false;
}

/** Every JSON-LD block on the page, parsed. Broken blocks are skipped. */
export function jsonLdBlocks(html: string): Json[] {
  const blocks: Json[] = [];
  const re = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(re)) {
    const raw = (match[1] ?? "")
      .replace(/^\s*<!--/, "")
      .replace(/-->\s*$/, "")
      .replace(/^\s*\/\/\s*<!\[CDATA\[/, "")
      .replace(/\/\/\s*\]\]>\s*$/, "")
      .trim();
    if (!raw) continue;
    try {
      blocks.push(JSON.parse(raw) as Json);
    } catch {
      // Some sites put raw newlines inside strings; try once more without them.
      try {
        blocks.push(JSON.parse(raw.replace(/[\u0000-\u001f]+/g, " ")) as Json);
      } catch {
        /* skip */
      }
    }
  }
  return blocks;
}

/** Depth-first search for the first node with @type Recipe. */
export function findRecipeNode(value: Json, depth = 0): JsonObject | undefined {
  if (depth > 8 || value === null || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecipeNode(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (hasType(value, "Recipe")) return value;
  for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "itemListElement", "item"]) {
    const child = value[key];
    if (child !== undefined) {
      const found = findRecipeNode(child, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

function text(value: Json | undefined): string | undefined {
  if (typeof value === "string") return plainText(value) || undefined;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return text(value.find((v) => typeof v === "string" || typeof v === "number"));
  if (isObject(value)) return text(value.name ?? value.text ?? value["@value"]);
  return undefined;
}

function imageUrl(value: Json | undefined, base: string): string | undefined {
  let candidate: string | undefined;
  if (typeof value === "string") candidate = value;
  else if (Array.isArray(value)) {
    // Prefer the last (usually largest) image.
    for (const item of [...value].reverse()) {
      const found = imageUrl(item, base);
      if (found) return found;
    }
  } else if (isObject(value))
    candidate =
      typeof value.url === "string" ? value.url : typeof value.contentUrl === "string" ? value.contentUrl : undefined;
  if (!candidate) return undefined;
  try {
    const url = new URL(decodeEntities(candidate), base);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString().replace(/^http:/, "https:")
      : undefined;
  } catch {
    return undefined;
  }
}

function instructionSteps(value: Json | undefined, depth = 0): string[] {
  if (value === undefined || value === null || depth > 5) return [];
  if (typeof value === "string") {
    return plainText(value)
      .split(/\n+/)
      .map((s) => s.replace(/^(?:step\s*\d+\s*[:.)-]?|\d+\s*[.)])\s*/i, "").trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) return value.flatMap((v) => instructionSteps(v, depth + 1));
  if (isObject(value)) {
    if (hasType(value, "HowToSection") || value.itemListElement !== undefined) {
      return instructionSteps(value.itemListElement ?? null, depth + 1);
    }
    const t = text(value.text ?? value.name ?? null);
    return t ? [t] : [];
  }
  return [];
}

function list(value: Json | undefined): string[] {
  if (value === undefined || value === null) return [];
  if (Array.isArray(value)) return value.flatMap((v) => list(v));
  if (typeof value === "string")
    return value
      .split(",")
      .map((s) => plainText(s))
      .filter(Boolean);
  const t = text(value);
  return t ? [t] : [];
}

function yieldText(value: Json | undefined): string | undefined {
  const values = (Array.isArray(value) ? value : [value]).map((v) => text(v ?? null)).filter(Boolean) as string[];
  // Many sites give ["4", "4 servings"]; take the most descriptive one.
  const best = values.sort((a, b) => b.length - a.length)[0];
  if (!best) return undefined;
  return /^\d+$/.test(best) ? `${best} servings` : best;
}

/** Read a schema.org Recipe from a page's HTML. Returns null when the page has none. */
export function extractRecipe(html: string, pageUrl: string): Recipe | null {
  let node: JsonObject | undefined;
  for (const block of jsonLdBlocks(html)) {
    node = findRecipeNode(block);
    if (node) break;
  }
  if (!node) return null;

  const title = text(node.name ?? node.headline ?? null);
  const ingredientLines = list(node.recipeIngredient ?? node.ingredients ?? null);
  const steps = instructionSteps(node.recipeInstructions ?? null);
  if (!title || (!ingredientLines.length && !steps.length)) return null;

  const author = isObject(node.author)
    ? text(node.author.name ?? null)
    : Array.isArray(node.author)
      ? text(node.author.map((a) => (isObject(a) ? (a.name ?? null) : a)))
      : text(node.author ?? null);

  const site = hostname(pageUrl);
  return {
    source: { kind: "web", url: pageUrl, site },
    title,
    summary: text(node.description ?? null),
    image: imageUrl(node.image ?? node.thumbnailUrl ?? null, pageUrl),
    cuisine: list(node.recipeCuisine ?? null)[0],
    category: list(node.recipeCategory ?? null)[0],
    tags: list(node.keywords ?? null).slice(0, 8),
    ingredients: ingredientLines.slice(0, 60).map(parseIngredientLine),
    steps: steps.slice(0, 60),
    servings: yieldText(node.recipeYield ?? null),
    totalTime: formatDuration(text(node.totalTime ?? null)) ?? formatDuration(text(node.cookTime ?? null)),
    sourceUrl: pageUrl,
    author,
  };
}

/** The page's title, used to offer an AI version when a page has no recipe data. */
export function pageTitle(html: string): string | undefined {
  const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
  const title = og ?? /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1];
  return title ? plainText(title).slice(0, 120) : undefined;
}
