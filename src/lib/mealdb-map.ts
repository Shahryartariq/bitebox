import { splitSteps } from "./ingredients";
import { normalize, slugify, tokens } from "./text";
import type { Ingredient, Recipe, RecipeSummary } from "./types";

/** A meal as TheMealDB returns it (only the fields Bitebox reads). */
export interface RawMeal {
  idMeal: string;
  strMeal: string;
  strMealAlternate?: string | null;
  strCategory?: string | null;
  strArea?: string | null;
  strCountry?: string | null;
  strInstructions?: string | null;
  strMealThumb?: string | null;
  strTags?: string | null;
  strYoutube?: string | null;
  strSource?: string | null;
  [key: `strIngredient${number}`]: string | null | undefined;
  [key: `strMeasure${number}`]: string | null | undefined;
}

export interface RawCategory {
  idCategory: string;
  strCategory: string;
  strCategoryThumb?: string;
}

/** Everything search needs about one meal, precomputed once per catalog load. */
export interface MealRecord {
  summary: RecipeSummary;
  ingredients: string[];
  tags: string[];
  nameWords: string[];
  ingredientWords: string[];
  otherWords: string[];
  normalizedName: string;
}

const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

export function mealIngredients(meal: RawMeal): Ingredient[] {
  const list: Ingredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = clean(meal[`strIngredient${i}`]);
    if (!name) continue;
    list.push({ name, measure: clean(meal[`strMeasure${i}`]) });
  }
  return list;
}

export function mealCuisine(meal: RawMeal): string | undefined {
  return clean(meal.strCountry) || clean(meal.strArea) || undefined;
}

export function mealSlug(meal: Pick<RawMeal, "idMeal" | "strMeal">): string {
  // Bitebox's own recipes already have readable ids ("pk-chicken-karahi").
  if (meal.idMeal.startsWith("pk-")) return meal.idMeal;
  return `${meal.idMeal}-${slugify(meal.strMeal)}`;
}

export function idFromSlug(slug: string): string | undefined {
  if (/^pk-[a-z0-9-]{2,60}$/.test(slug)) return slug;
  const m = /^(\d{1,9})(?:-|$)/.exec(slug);
  return m?.[1];
}

export function toSummary(meal: RawMeal): RecipeSummary {
  return {
    id: meal.idMeal,
    slug: mealSlug(meal),
    title: clean(meal.strMeal),
    image: clean(meal.strMealThumb),
    cuisine: mealCuisine(meal),
    category: clean(meal.strCategory) || undefined,
  };
}

function describe(title: string, cuisine: string | undefined, category: string | undefined, ingredients: Ingredient[]) {
  const main = ingredients
    .map((i) => i.name.toLowerCase())
    .filter((n) => !/^(salt|pepper|water|oil|olive oil|vegetable oil|butter|sugar)$/.test(n))
    .slice(0, 3);
  const kind = category && !/miscellaneous/i.test(category) ? category.toLowerCase() : "dish";
  const from = cuisine ? ` from ${cuisine}` : "";
  const withPart = main.length ? ` made with ${main.join(", ")}` : "";
  return `${title}: a ${kind} recipe${from}${withPart}.`;
}

export function toRecipe(meal: RawMeal): Recipe {
  const ingredients = mealIngredients(meal);
  const cuisine = mealCuisine(meal);
  const category = clean(meal.strCategory) || undefined;
  const title = clean(meal.strMeal);
  return {
    source: { kind: "mealdb", id: meal.idMeal },
    title,
    summary: describe(title, cuisine, category, ingredients),
    image: clean(meal.strMealThumb) || undefined,
    cuisine,
    category,
    tags: clean(meal.strTags)
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    ingredients,
    steps: splitSteps(meal.strInstructions ?? ""),
    video: clean(meal.strYoutube) || undefined,
    sourceUrl: clean(meal.strSource) || undefined,
  };
}

export function toRecord(meal: RawMeal): MealRecord {
  const summary = toSummary(meal);
  const ingredients = mealIngredients(meal).map((i) => i.name);
  const tags = clean(meal.strTags)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return {
    summary,
    ingredients,
    tags,
    nameWords: tokens(`${summary.title} ${clean(meal.strMealAlternate)}`),
    ingredientWords: tokens(ingredients.join(" ")),
    otherWords: tokens([summary.cuisine, summary.category, clean(meal.strArea), ...tags].filter(Boolean).join(" ")),
    normalizedName: normalize(summary.title),
  };
}

const UNSPLASH_WIDTH = { small: 400, medium: 700, large: 1200 } as const;

/**
 * Smaller copies of recipe photos: TheMealDB serves them when "/small", "/medium" or "/large"
 * is appended; Unsplash resizes with the w= parameter.
 */
export function sizedImage(url: string | undefined, size: "small" | "medium" | "large"): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("https://images.unsplash.com/")) {
    try {
      const u = new URL(url);
      u.searchParams.set("w", String(UNSPLASH_WIDTH[size]));
      return u.toString();
    } catch {
      return url;
    }
  }
  return /themealdb\.com\/images\//.test(url) && !/\/(small|medium|large)$/.test(url) ? `${url}/${size}` : url;
}
