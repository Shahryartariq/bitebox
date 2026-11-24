import { describe, expect, it } from "vitest";
import { recipeContext } from "@/lib/ai/prompts";
import { askRequest, recipeRef } from "@/lib/ai/schemas";
import { jsonLdString } from "@/lib/seo";
import { decodeEntities, formatDuration, looksLikeUrl, slugify, toUrl } from "@/lib/text";
import type { Recipe } from "@/lib/types";

describe("text helpers", () => {
  it("recognises pasted links", () => {
    expect(looksLikeUrl("https://example.com/a")).toBe(true);
    expect(looksLikeUrl("www.example.com/recipe/soup")).toBe(true);
    expect(looksLikeUrl("example.com/soup")).toBe(true);
    expect(looksLikeUrl("chicken soup")).toBe(false);
    expect(looksLikeUrl("example.com")).toBe(false);
    expect(toUrl("example.com/soup")).toBe("https://example.com/soup");
  });

  it("formats ISO 8601 durations", () => {
    expect(formatDuration("PT45M")).toBe("45 min");
    expect(formatDuration("PT1H")).toBe("1 hr");
    expect(formatDuration("P1DT2H")).toBe("26 hr");
    expect(formatDuration("PT0S")).toBeUndefined();
    expect(formatDuration("45 minutes")).toBeUndefined();
  });

  it("decodes entities and makes slugs", () => {
    expect(decodeEntities("Mac &amp; cheese &#8211; &frac12; cup &#x27;ok&#x27;")).toBe("Mac & cheese – ½ cup 'ok'");
    expect(slugify("Crème Brûlée & Friends!")).toBe("creme-brulee-and-friends");
  });
});

describe("request schemas", () => {
  const ref = { kind: "mealdb", id: "52772" } as const;

  it("accepts a normal question", () => {
    expect(
      askRequest.safeParse({ recipe: ref, messages: [{ role: "user", content: "Can I skip the sugar?" }] }).success,
    ).toBe(true);
  });
  it("needs the last message to be the cook's", () => {
    const result = askRequest.safeParse({
      recipe: ref,
      messages: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello" },
      ],
    });
    expect(result.success).toBe(false);
  });
  it("limits question length", () => {
    expect(askRequest.safeParse({ recipe: ref, messages: [{ role: "user", content: "x".repeat(501) }] }).success).toBe(
      false,
    );
  });
  it("only accepts numeric TheMealDB ids", () => {
    expect(recipeRef.safeParse({ kind: "mealdb", id: "52772 OR 1=1" }).success).toBe(false);
    expect(recipeRef.safeParse({ kind: "web", url: "https://example.com/soup" }).success).toBe(true);
    expect(recipeRef.safeParse({ kind: "web", url: "not a url" }).success).toBe(false);
  });
});

describe("prompt context", () => {
  const recipe: Recipe = {
    source: { kind: "mealdb", id: "1" },
    title: "Dal fry",
    cuisine: "India",
    tags: [],
    ingredients: [{ measure: "1 cup", name: "Toor dal" }],
    steps: ["Soak the dal."],
  };
  it("lists ingredients and numbered steps", () => {
    const text = recipeContext(recipe);
    expect(text).toContain("Recipe: Dal fry");
    expect(text).toContain("- 1 cup Toor dal");
    expect(text).toContain("1. Soak the dal.");
  });
  it("shortens very long recipes", () => {
    const long = { ...recipe, steps: Array.from({ length: 200 }, () => "Stir the pot slowly for a while.") };
    const text = recipeContext(long);
    expect(text.length).toBeLessThan(6100);
    expect(text).toContain("[recipe shortened]");
  });
});

describe("jsonLdString", () => {
  it("can't close the script tag", () => {
    const out = jsonLdString({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
  });
});
