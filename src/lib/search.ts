import { pantryCovers, isFreeIngredient } from "./ingredients";
import type { MealRecord } from "./mealdb-map";
import { normalize, tokens } from "./text";
import type { RecipeSummary } from "./types";

export interface SearchHit {
  recipe: RecipeSummary;
  score: number;
}

/**
 * Rank meals for a free-text query. Name matches beat ingredient matches, which beat
 * cuisine/category/tag matches. Every query word must match somewhere.
 */
export function searchMeals(records: MealRecord[], query: string, limit = 48): SearchHit[] {
  const words = tokens(query);
  const phrase = normalize(query);
  if (!words.length) return [];

  const hits: SearchHit[] = [];
  for (const record of records) {
    let score = 0;
    let matchedAll = true;
    for (const word of words) {
      const inName = record.nameWords.some((w) => w === word || (word.length >= 4 && w.startsWith(word)));
      const inIngredients = record.ingredientWords.includes(word);
      const inOther = record.otherWords.includes(word);
      if (inName) score += 10;
      else if (inIngredients) score += 4;
      else if (inOther) score += 3;
      else {
        matchedAll = false;
        break;
      }
    }
    if (!matchedAll) continue;
    if (record.normalizedName === phrase) score += 30;
    else if (record.normalizedName.includes(phrase)) score += 12;
    if (record.normalizedName.startsWith(phrase)) score += 4;
    hits.push({ recipe: record.summary, score });
  }

  return hits.sort((a, b) => b.score - a.score || a.recipe.title.localeCompare(b.recipe.title)).slice(0, limit);
}

export interface PantryHit {
  recipe: RecipeSummary;
  have: string[];
  missing: string[];
}

/**
 * "What can I cook with what I have": rank meals by how many of the pantry items they use,
 * then by how few other ingredients are missing.
 */
export function matchPantry(records: MealRecord[], pantry: string[], limit = 48): PantryHit[] {
  const items = [...new Set(pantry.map((p) => p.trim()).filter(Boolean))];
  if (!items.length) return [];

  const hits: Array<PantryHit & { used: number }> = [];
  for (const record of records) {
    const used = items.filter((item) => record.ingredients.some((name) => pantryCovers(item, name))).length;
    if (!used) continue;
    const have: string[] = [];
    const missing: string[] = [];
    for (const name of record.ingredients) {
      if (isFreeIngredient(name)) continue;
      if (items.some((item) => pantryCovers(item, name))) have.push(name);
      else missing.push(name);
    }
    hits.push({ recipe: record.summary, have, missing, used });
  }

  return hits
    .sort(
      (a, b) => b.used - a.used || a.missing.length - b.missing.length || a.recipe.title.localeCompare(b.recipe.title),
    )
    .slice(0, limit)
    .map(({ recipe, have, missing }) => ({ recipe, have, missing }));
}

/** Split "chicken, rice and onion" into ["chicken", "rice", "onion"]. */
export function parsePantryInput(input: string): string[] {
  return input
    .split(/,|;|\band\b|\n|\+/i)
    .map((s) => s.replace(/\s+/g, " ").trim().toLowerCase())
    .filter((s) => s.length > 1 && s.length <= 40)
    .slice(0, 12);
}
