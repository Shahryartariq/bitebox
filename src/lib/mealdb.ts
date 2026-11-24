import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { env } from "./env";
import { isLocalId, localRawMeals, localRecipe } from "./local-recipes";
import { type MealRecord, type RawCategory, type RawMeal, toRecipe, toRecord } from "./mealdb-map";
import { slugify } from "./text";
import type { Category, Cuisine, Recipe, RecipeSummary } from "./types";

const BASE = "https://www.themealdb.com/api/json/v1";
const DAY = 60 * 60 * 24;
// TheMealDB's search-by-first-letter covers the whole catalog in 36 small requests.
const FIRST_CHARACTERS = "abcdefghijklmnopqrstuvwxyz0123456789".split("");

interface Catalog {
  meals: RawMeal[];
  records: MealRecord[];
  byId: Map<string, RawMeal>;
  loadedAt: number;
}

async function fetchJson<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${BASE}/${env.mealdbKey}/${endpoint}`, {
    next: { revalidate: DAY, tags: ["mealdb"] },
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`TheMealDB ${endpoint}: HTTP ${res.status}`);
  return (await res.json()) as T;
}

async function readFixture<T>(name: string): Promise<T> {
  const file = path.join(process.cwd(), "tests", "fixtures", "mealdb", name);
  return JSON.parse(await readFile(file, "utf8")) as T;
}

async function loadMeals(): Promise<RawMeal[]> {
  if (env.sampleData) return readFixture<RawMeal[]>("meals.json");

  const meals: RawMeal[] = [];
  let failures = 0;
  // Six at a time keeps us polite to a free API.
  for (let i = 0; i < FIRST_CHARACTERS.length; i += 6) {
    const batch = FIRST_CHARACTERS.slice(i, i + 6);
    const results = await Promise.allSettled(
      batch.map((c) => fetchJson<{ meals: RawMeal[] | null }>(`search.php?f=${c}`)),
    );
    for (const result of results) {
      if (result.status === "fulfilled") meals.push(...(result.value.meals ?? []));
      else failures++;
    }
  }
  if (!meals.length) throw new Error(`TheMealDB is unavailable (${failures} requests failed)`);
  if (failures) console.warn(`[mealdb] ${failures} of ${FIRST_CHARACTERS.length} catalog requests failed`);
  return meals;
}

let catalogPromise: Promise<Catalog> | undefined;

/** The whole TheMealDB catalog, indexed for search. Cached for an hour per server instance. */
export async function getCatalog(): Promise<Catalog> {
  if (catalogPromise) {
    const current = await catalogPromise.catch(() => undefined);
    if (current && Date.now() - current.loadedAt < 60 * 60 * 1000) return current;
  }
  const next = loadMeals().then((meals) => {
    const unique = new Map<string, RawMeal>();
    for (const meal of [...localRawMeals(), ...meals]) if (meal?.idMeal && meal.strMeal) unique.set(meal.idMeal, meal);
    const list = [...unique.values()];
    return { meals: list, records: list.map(toRecord), byId: unique, loadedAt: Date.now() };
  });
  catalogPromise = next;
  next.catch(() => {
    if (catalogPromise === next) catalogPromise = undefined;
  });
  return next;
}

export async function getRecipe(id: string): Promise<Recipe | null> {
  if (isLocalId(id)) return localRecipe(id);
  if (!/^\d{1,9}$/.test(id)) return null;
  const catalog = await getCatalog().catch(() => undefined);
  const cached = catalog?.byId.get(id);
  if (cached) return toRecipe(cached);
  if (env.sampleData) return null;
  const data = await fetchJson<{ meals: RawMeal[] | null }>(`lookup.php?i=${id}`);
  const meal = data.meals?.[0];
  return meal ? toRecipe(meal) : null;
}

export async function getCuisines(): Promise<Cuisine[]> {
  const { records } = await getCatalog();
  const counts = new Map<string, number>();
  for (const r of records)
    if (r.summary.cuisine) counts.set(r.summary.cuisine, (counts.get(r.summary.cuisine) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getCuisine(slug: string): Promise<{ cuisine: Cuisine; recipes: RecipeSummary[] } | null> {
  const cuisines = await getCuisines();
  const cuisine = cuisines.find((c) => c.slug === slug);
  if (!cuisine) return null;
  const { records } = await getCatalog();
  const recipes = records
    .filter((r) => r.summary.cuisine === cuisine.name)
    .map((r) => r.summary)
    .sort((a, b) => a.title.localeCompare(b.title));
  return { cuisine, recipes };
}

async function loadCategoryImages(): Promise<Map<string, string>> {
  try {
    const list = env.sampleData
      ? await readFixture<RawCategory[]>("categories.json")
      : (await fetchJson<{ categories: RawCategory[] }>("categories.php")).categories;
    return new Map(list.map((c) => [c.strCategory, c.strCategoryThumb ?? ""]));
  } catch {
    return new Map();
  }
}

export async function getCategories(): Promise<Category[]> {
  const [{ records }, images] = await Promise.all([getCatalog(), loadCategoryImages()]);
  const counts = new Map<string, number>();
  for (const r of records)
    if (r.summary.category) counts.set(r.summary.category, (counts.get(r.summary.category) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, slug: slugify(name), count, image: images.get(name) || undefined }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export async function getCategory(slug: string): Promise<{ category: Category; recipes: RecipeSummary[] } | null> {
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return null;
  const { records } = await getCatalog();
  const recipes = records
    .filter((r) => r.summary.category === category.name)
    .map((r) => r.summary)
    .sort((a, b) => a.title.localeCompare(b.title));
  return { category, recipes };
}

/** A stable daily selection, so the home page changes once a day and caches well. */
export async function getDailyPicks(count: number, date = new Date()): Promise<RecipeSummary[]> {
  const { records } = await getCatalog();
  const day = Math.floor(date.getTime() / (DAY * 1000));
  const scored = records.map((r) => {
    let h = day ^ Number(r.summary.id);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    return { r, h: (h ^ (h >>> 16)) >>> 0 };
  });
  return scored
    .filter(({ r }) => r.summary.image)
    .sort((a, b) => a.h - b.h)
    .slice(0, count)
    .map(({ r }) => r.summary);
}
