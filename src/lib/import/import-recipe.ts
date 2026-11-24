import "server-only";
import { unstable_cache } from "next/cache";
import type { Recipe } from "../types";
import { extractRecipe, pageTitle } from "./jsonld";
import { fetchPublicPage, ImportError } from "./safe-fetch";

export type ImportResult =
  | { ok: true; recipe: Recipe }
  | { ok: false; code: ImportError["code"] | "no-recipe"; message: string; title?: string };

/** Errors worth caching (the answer won't change in the next hour). Others are retried next time. */
const STABLE_ERRORS = new Set<ImportError["code"]>(["invalid-url", "blocked-address", "not-html", "too-large"]);

async function importUncached(url: string): Promise<ImportResult> {
  try {
    const page = await fetchPublicPage(url);
    const recipe = extractRecipe(page.html, page.url);
    if (recipe) return { ok: true, recipe };
    return {
      ok: false,
      code: "no-recipe",
      message: "This page doesn't include recipe details that Bitebox can read.",
      title: pageTitle(page.html),
    };
  } catch (error) {
    if (error instanceof ImportError && STABLE_ERRORS.has(error.code)) {
      return { ok: false, code: error.code, message: error.message };
    }
    throw error;
  }
}

const cachedImport = unstable_cache(importUncached, ["import-recipe-v1"], { revalidate: 3600 });

/** Import a recipe from a link. Results are cached for an hour so the kitchen helper can reuse them. */
export async function importRecipe(url: string): Promise<ImportResult> {
  try {
    return await cachedImport(url);
  } catch (error) {
    if (error instanceof ImportError) return { ok: false, code: error.code, message: error.message };
    console.error("[import] unexpected error", error);
    return { ok: false, code: "network", message: "The page couldn't be read." };
  }
}
