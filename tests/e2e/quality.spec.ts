import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

const PAGES = [
  "/",
  "/search?q=chicken",
  "/search?have=chicken,garlic",
  "/recipe/52772-teriyaki-chicken-casserole",
  "/cuisines",
  "/cuisine/india",
  "/category/chicken",
  "/saved",
  "/about",
  "/privacy",
  "/import?url=http%3A%2F%2F127.0.0.1%2F",
  "/nope",
];

for (const path of PAGES) {
  for (const scheme of ["light", "dark"] as const) {
    test(`${path} has no accessibility violations (${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", scheme);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual(
        [],
      );
    });
  }

  test(`${path} doesn't scroll sideways on a narrow phone`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test("security headers are set", async ({ request }) => {
  const res = await request.get("/");
  const headers = res.headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["strict-transport-security"]).toContain("max-age=");
  expect(headers["x-powered-by"]).toBeUndefined();
});

test("recipe pages carry Recipe structured data and a canonical link", async ({ page }) => {
  await page.goto("/recipe/52772-teriyaki-chicken-casserole");
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  const recipe = blocks.map((b) => JSON.parse(b)).find((b) => b["@type"] === "Recipe");
  expect(recipe.name).toBe("Teriyaki Chicken Casserole");
  expect(recipe.recipeIngredient).toContain("3/4 cup soy sauce");
  expect(recipe.recipeInstructions[0]["@type"]).toBe("HowToStep");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/recipe\/52772-teriyaki-chicken-casserole$/,
  );
});

test("sitemap lists recipes and robots keeps private pages out", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/recipe/52772-teriyaki-chicken-casserole");
  expect(sitemap).toContain("/cuisine/india");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /api/");
  expect(robots).toContain("Disallow: /import");
});

test.describe("AI endpoints", () => {
  const body = { recipe: { kind: "mealdb", id: "52772" }, messages: [{ role: "user", content: "Make it spicier" }] };

  test("refuse requests from other websites", async ({ request }) => {
    const res = await request.post("/api/ai/ask", { data: body, headers: { origin: "https://evil.example" } });
    expect(res.status()).toBe(403);
  });

  test("reject bad input", async ({ request }) => {
    const res = await request.post("/api/ai/ask", { data: { recipe: { kind: "mealdb", id: "x" }, messages: [] } });
    expect(res.status()).toBe(400);
    const tooBig = await request.post("/api/ai/substitute", {
      data: { recipe: body.recipe, ingredient: { measure: "", name: "x".repeat(30_000) } },
    });
    expect(tooBig.status()).toBe(413);
  });

  test("404 for a recipe that doesn't exist", async ({ request }) => {
    const res = await request.post("/api/ai/ask", { data: { ...body, recipe: { kind: "mealdb", id: "1" } } });
    expect(res.status()).toBe(404);
  });

  test("stream an answer", async ({ request }) => {
    const res = await request.post("/api/ai/ask", { data: body });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/plain");
    expect(await res.text()).toContain("chilli flakes");
  });
});
