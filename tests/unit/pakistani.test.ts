import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAKISTANI_RECIPES } from "@/data/pakistani";
import { recipeRef } from "@/lib/ai/schemas";
import { formatMinutes, isoDuration, localRawMeals, localRecipe } from "@/lib/local-recipes";
import { idFromSlug, mealSlug, sizedImage, toRecord, type RawMeal } from "@/lib/mealdb-map";
import { matchPantry, searchMeals } from "@/lib/search";

const CATEGORIES = ["Beef", "Breakfast", "Chicken", "Dessert", "Goat", "Lamb", "Starter", "Vegetarian", "Side"];

describe("Pakistani recipes", () => {
  it("have unique, URL-safe ids", () => {
    const ids = PAKISTANI_RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^pk-[a-z0-9-]+$/);
  });

  it.each(PAKISTANI_RECIPES.map((r) => [r.title, r] as const))("%s is complete", (_, r) => {
    expect(r.summary.length).toBeGreaterThan(40);
    expect(CATEGORIES).toContain(r.category);
    expect(r.ingredients.length).toBeGreaterThanOrEqual(6);
    expect(r.steps.length).toBeGreaterThanOrEqual(4);
    expect(r.minutes).toBeGreaterThan(0);
    expect(r.alsoKnownAs.length).toBeGreaterThan(0);
    expect(r.photo.id).toMatch(/^\d{10,13}-[0-9a-f]{12}$/);
    expect(r.photo.by).toMatch(/^[A-Za-z0-9_]+$/);
    for (const ing of r.ingredients) expect(ing.name.trim()).not.toBe("");
  });

  it("load as full recipes with photo credit and time", () => {
    const karahi = localRecipe("pk-chicken-karahi")!;
    expect(karahi.source).toEqual({ kind: "bitebox", id: "pk-chicken-karahi" });
    expect(karahi.cuisine).toBe("Pakistan");
    expect(karahi.totalTime).toBe("45 min");
    expect(karahi.photoCredit).toEqual({
      name: "@rimshaj123",
      url: "https://unsplash.com/@rimshaj123?utm_source=bitebox&utm_medium=referral",
    });
    expect(localRecipe("pk-nope")).toBeNull();
    // Long ingredient lists are kept in full on the recipe page.
    expect(localRecipe("pk-chicken-biryani")!.ingredients.length).toBeGreaterThan(20);
  });

  it("use readable slugs", () => {
    expect(mealSlug({ idMeal: "pk-beef-nihari", strMeal: "Beef Nihari" })).toBe("pk-beef-nihari");
    expect(idFromSlug("pk-beef-nihari")).toBe("pk-beef-nihari");
    expect(idFromSlug("pk-../etc")).toBeUndefined();
  });

  it("are accepted by the AI endpoints", () => {
    expect(recipeRef.safeParse({ kind: "bitebox", id: "pk-chicken-karahi" }).success).toBe(true);
    expect(recipeRef.safeParse({ kind: "bitebox", id: "52772" }).success).toBe(false);
  });
});

describe("Pakistani recipes in search", () => {
  const meals = JSON.parse(readFileSync("tests/fixtures/mealdb/meals.json", "utf8")) as RawMeal[];
  const records = [...localRawMeals(), ...meals].map(toRecord);
  const titles = (q: string) => searchMeals(records, q).map((h) => h.recipe.title);

  it("finds dishes by name and by other spellings", () => {
    expect(titles("karahi")[0]).toBe("Chicken Karahi");
    expect(titles("kabab")).toEqual(expect.arrayContaining(["Chapli Kebab", "Seekh Kebab"]));
    expect(titles("khichra")).toEqual(["Haleem"]);
    expect(titles("pakoray")).toEqual(["Aloo Pyaz Pakora"]);
  });

  it("finds every recipe by cuisine", () => {
    expect(titles("pakistan")).toHaveLength(PAKISTANI_RECIPES.length);
  });

  it("show up for what's in the kitchen", () => {
    const hits = matchPantry(records, ["chickpeas", "onion", "tomato", "potato"]).map((h) => h.recipe.title);
    expect(hits[0]).toBe("Chana Chaat");
  });
});

describe("photo and time helpers", () => {
  it("resizes Unsplash photos", () => {
    const url = "https://images.unsplash.com/photo-1-abc?auto=format&fit=crop&w=1100&q=70";
    expect(sizedImage(url, "medium")).toBe("https://images.unsplash.com/photo-1-abc?auto=format&fit=crop&w=700&q=70");
  });
  it("formats durations", () => {
    expect(formatMinutes(270)).toBe("4 hr 30 min");
    expect(formatMinutes(60)).toBe("1 hr");
    expect(isoDuration(90)).toBe("PT1H30M");
    expect(isoDuration(15)).toBe("PT15M");
  });
});
