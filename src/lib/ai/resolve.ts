import "server-only";
import { importRecipe } from "../import/import-recipe";
import { getRecipe } from "../mealdb";
import type { Recipe } from "../types";
import type { RecipeRef } from "./schemas";

/**
 * Load the recipe the cook is asking about. Database and imported recipes are loaded again on
 * the server so the browser can't put arbitrary text in the prompt; AI recipes only exist in the
 * browser, so they come from the request (already length-checked).
 */
export async function resolveRecipe(ref: RecipeRef): Promise<Recipe | null> {
  if (ref.kind === "mealdb") return getRecipe(ref.id);
  if (ref.kind === "web") {
    const result = await importRecipe(ref.url);
    return result.ok ? result.recipe : null;
  }
  return {
    source: { kind: "ai", prompt: ref.recipe.title },
    title: ref.recipe.title,
    summary: ref.recipe.summary,
    servings: ref.recipe.servings,
    tags: [],
    ingredients: ref.recipe.ingredients,
    steps: ref.recipe.steps,
  };
}
