import { PAKISTANI_RECIPES, type LocalRecipe } from "@/data/pakistani";
import type { RawMeal } from "./mealdb-map";
import type { Recipe } from "./types";

const UNSPLASH = "https://images.unsplash.com/photo-";

export function unsplashUrl(id: string, width = 1100): string {
  return `${UNSPLASH}${id}?auto=format&fit=crop&w=${width}&q=70`;
}

/** Unsplash asks for "Photo by <name> on Unsplash" with links back to both. */
export function unsplashCredit(username: string) {
  return {
    name: `@${username}`,
    url: `https://unsplash.com/@${username}?utm_source=bitebox&utm_medium=referral`,
  };
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} hr` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
}

export function isoDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}` || "PT0M";
}

export const LOCAL_CUISINE = "Pakistan";

const byId = new Map(PAKISTANI_RECIPES.map((r) => [r.id, r]));

export function isLocalId(id: string): boolean {
  return /^pk-[a-z0-9-]{2,60}$/.test(id);
}

/** The same shape TheMealDB uses, so local recipes go through the same search index. */
export function toRawMeal(r: LocalRecipe): RawMeal {
  const raw: RawMeal = {
    idMeal: r.id,
    strMeal: r.title,
    strMealAlternate: r.alsoKnownAs.join(", "),
    strCategory: r.category,
    strArea: "Pakistani",
    strCountry: LOCAL_CUISINE,
    strInstructions: r.steps.join("\r\n"),
    strMealThumb: unsplashUrl(r.photo.id),
    strTags: r.tags.join(","),
  };
  r.ingredients.slice(0, 20).forEach((ing, n) => {
    raw[`strIngredient${n + 1}`] = ing.name;
    raw[`strMeasure${n + 1}`] = ing.measure;
  });
  return raw;
}

export function localRawMeals(): RawMeal[] {
  return PAKISTANI_RECIPES.map(toRawMeal);
}

export function localRecipe(id: string): Recipe | null {
  const r = byId.get(id);
  if (!r) return null;
  return {
    source: { kind: "bitebox", id: r.id },
    title: r.title,
    summary: r.summary,
    image: unsplashUrl(r.photo.id),
    photoCredit: unsplashCredit(r.photo.by),
    cuisine: LOCAL_CUISINE,
    category: r.category,
    tags: r.tags,
    ingredients: r.ingredients,
    steps: r.steps,
    servings: r.servings,
    totalTime: formatMinutes(r.minutes),
    totalMinutes: r.minutes,
    tips: r.tips,
  };
}
