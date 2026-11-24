import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { idFromSlug, mealSlug, sizedImage, toRecipe, toRecord, type RawMeal } from "@/lib/mealdb-map";
import { matchPantry, parsePantryInput, searchMeals } from "@/lib/search";

const meals = JSON.parse(readFileSync("tests/fixtures/mealdb/meals.json", "utf8")) as RawMeal[];
const records = meals.map(toRecord);
const titles = (hits: Array<{ recipe: { title: string } }>) => hits.map((h) => h.recipe.title);

describe("searchMeals", () => {
  it("puts name matches before ingredient matches", () => {
    const hits = titles(searchMeals(records, "chicken"));
    expect(hits.slice(0, 3)).toEqual(
      expect.arrayContaining(["Chicken Enchilada Casserole", "Teriyaki Chicken Casserole", "Chicken Handi"]),
    );
    expect(hits).toContain("Pad See Ew"); // chicken is an ingredient
  });

  it("matches plurals and partial words", () => {
    // Titles that start with the query come first.
    expect(titles(searchMeals(records, "teriyaki"))).toEqual(["Teriyaki Chicken Casserole", "Honey Teriyaki Salmon"]);
    expect(titles(searchMeals(records, "tomatoes soup"))).toContain("Creamy Tomato Soup");
  });

  it("finds by cuisine and category", () => {
    expect(titles(searchMeals(records, "india"))).toEqual(
      expect.arrayContaining(["Chicken Handi", "Dal fry", "Baingan Bharta"]),
    );
    expect(titles(searchMeals(records, "vegan"))).toContain("Vegan Chocolate Cake");
  });

  it("needs every word to match", () => {
    expect(titles(searchMeals(records, "chicken chocolate"))).toEqual([]);
    expect(searchMeals(records, "   ")).toEqual([]);
  });

  it("ranks an exact title first", () => {
    expect(titles(searchMeals(records, "Dal fry"))[0]).toBe("Dal fry");
  });
});

describe("matchPantry", () => {
  it("ranks recipes by how many pantry items they use", () => {
    const hits = matchPantry(records, ["chicken", "garlic", "tomato"]);
    expect(hits[0]?.recipe.title).toBe("Chicken Handi");
    expect(hits[0]?.have).toEqual(expect.arrayContaining(["Chicken", "Garlic", "Tomatoes"]));
    expect(hits[0]?.missing).not.toContain("Water");
  });

  it("returns nothing for an empty pantry", () => {
    expect(matchPantry(records, [" ", ""])).toEqual([]);
  });
});

describe("parsePantryInput", () => {
  it("splits on commas and 'and'", () => {
    expect(parsePantryInput("Chicken, rice and onion; garlic")).toEqual(["chicken", "rice", "onion", "garlic"]);
  });
  it("drops very short or long items and caps the list", () => {
    expect(parsePantryInput("a, " + "x".repeat(50))).toEqual([]);
    expect(parsePantryInput(Array.from({ length: 20 }, (_, i) => `item${i}`).join(","))).toHaveLength(12);
  });
});

describe("TheMealDB mapping", () => {
  const teriyaki = meals.find((m) => m.idMeal === "52772")!;

  it("maps a meal to a recipe", () => {
    const recipe = toRecipe(teriyaki);
    expect(recipe.title).toBe("Teriyaki Chicken Casserole");
    expect(recipe.cuisine).toBe("Japan");
    expect(recipe.ingredients[0]).toEqual({ name: "soy sauce", measure: "3/4 cup" });
    expect(recipe.ingredients).toHaveLength(9);
    expect(recipe.steps.length).toBeGreaterThan(4);
    expect(recipe.tags).toEqual(["Meat", "Casserole"]);
    expect(recipe.summary).toContain("from Japan");
  });

  it("builds and reads slugs", () => {
    expect(mealSlug(teriyaki)).toBe("52772-teriyaki-chicken-casserole");
    expect(idFromSlug("52772-teriyaki-chicken-casserole")).toBe("52772");
    expect(idFromSlug("52772")).toBe("52772");
    expect(idFromSlug("teriyaki")).toBeUndefined();
  });

  it("asks TheMealDB for smaller photos", () => {
    expect(sizedImage("https://www.themealdb.com/images/media/meals/x.jpg", "medium")).toBe(
      "https://www.themealdb.com/images/media/meals/x.jpg/medium",
    );
    expect(sizedImage("https://example.com/x.jpg", "medium")).toBe("https://example.com/x.jpg");
  });
});
