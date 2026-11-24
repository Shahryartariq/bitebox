import { describe, expect, it } from "vitest";
import { isBlockedAddress } from "@/lib/import/ip";
import { extractRecipe, jsonLdBlocks, pageTitle } from "@/lib/import/jsonld";
import { ImportError, validateUrl } from "@/lib/import/safe-fetch";

const page = (json: string, extra = "") =>
  `<!doctype html><html><head><title>Best Lentil Soup | Example Kitchen</title>${extra}<script type="application/ld+json">${json}</script></head><body></body></html>`;

describe("extractRecipe", () => {
  it("reads a Recipe inside @graph with sections, image objects and ISO times", () => {
    const html = page(
      JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "WebSite", name: "Example Kitchen" },
          {
            "@type": ["Recipe", "NewsArticle"],
            name: "Red Lentil Soup &amp; Lemon",
            description: "<p>Warming and quick.</p>",
            image: [
              { "@type": "ImageObject", url: "/img/soup-small.jpg" },
              { "@type": "ImageObject", url: "/img/soup-large.jpg" },
            ],
            author: [{ "@type": "Person", name: "Sam Cook" }],
            recipeYield: ["4", "4 bowls"],
            totalTime: "PT1H5M",
            recipeCuisine: "Turkish",
            recipeCategory: ["Soup"],
            keywords: "lentils, vegan, quick",
            recipeIngredient: ["1 cup red lentils", "2 tbsp olive oil", "Salt, to taste"],
            recipeInstructions: [
              {
                "@type": "HowToSection",
                name: "Soup",
                itemListElement: [
                  { "@type": "HowToStep", text: "Rinse the lentils." },
                  { "@type": "HowToStep", text: "Simmer for 20 minutes." },
                ],
              },
              { "@type": "HowToStep", text: "Blend and season." },
            ],
          },
        ],
      }),
    );
    const recipe = extractRecipe(html, "https://example.com/soup");
    expect(recipe).toMatchObject({
      title: "Red Lentil Soup & Lemon",
      summary: "Warming and quick.",
      image: "https://example.com/img/soup-large.jpg",
      author: "Sam Cook",
      servings: "4 bowls",
      totalTime: "1 hr 5 min",
      cuisine: "Turkish",
      category: "Soup",
      tags: ["lentils", "vegan", "quick"],
      steps: ["Rinse the lentils.", "Simmer for 20 minutes.", "Blend and season."],
      source: { kind: "web", url: "https://example.com/soup", site: "example.com" },
    });
    expect(recipe?.ingredients[0]).toEqual({ measure: "1 cup", name: "red lentils" });
  });

  it("reads plain-string instructions", () => {
    const html = page(
      JSON.stringify({
        "@type": "Recipe",
        name: "Toast",
        recipeIngredient: ["1 slice bread"],
        recipeInstructions: "Toast the bread.\nButter it.",
      }),
    );
    expect(extractRecipe(html, "https://example.com/toast")?.steps).toEqual(["Toast the bread.", "Butter it."]);
  });

  it("skips broken blocks and finds the recipe in a later one", () => {
    const html = `<script type="application/ld+json">{ not json </script>${page(
      JSON.stringify({
        "@type": "Recipe",
        name: "Tea",
        recipeIngredient: ["1 tea bag"],
        recipeInstructions: ["Steep."],
      }),
    )}`;
    expect(jsonLdBlocks(html)).toHaveLength(1);
    expect(extractRecipe(html, "https://example.com/tea")?.title).toBe("Tea");
  });

  it("returns null when a page has no recipe", () => {
    const html = page(JSON.stringify({ "@type": "Article", name: "News" }));
    expect(extractRecipe(html, "https://example.com/news")).toBeNull();
    expect(pageTitle(html)).toBe("Best Lentil Soup | Example Kitchen");
  });

  it("drops non-http image URLs", () => {
    const html = page(
      JSON.stringify({
        "@type": "Recipe",
        name: "X",
        image: "javascript:alert(1)",
        recipeIngredient: ["1 egg"],
        recipeInstructions: ["Cook."],
      }),
    );
    expect(extractRecipe(html, "https://example.com/x")?.image).toBeUndefined();
  });
});

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "::1",
    "::",
    "fc00::1",
    "fd12:3456::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "64:ff9b::a00:1",
    "2002:a00:1::1",
    "not-an-ip",
  ])("blocks %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each(["8.8.8.8", "93.184.216.34", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])("allows %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

describe("validateUrl", () => {
  it("accepts normal public links", () => {
    expect(validateUrl("https://www.example.com/recipes/soup").hostname).toBe("www.example.com");
  });
  it.each([
    "ftp://example.com/x",
    "file:///etc/passwd",
    "https://user:pass@example.com/",
    "https://example.com:8080/",
    "http://localhost/",
    "http://127.0.0.1/",
    "http://[::1]/",
    "http://printer.local/",
    "http://intranet/",
    "not a url",
  ])("rejects %s", (url) => {
    expect(() => validateUrl(url)).toThrow(ImportError);
  });
});
