import { expect, test } from "./fixtures";

test("search by dish and open a recipe", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "What's for dinner?" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Dish, ingredient or recipe link" }).fill("teriyaki");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/search\?q=teriyaki/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("2 recipes for “teriyaki”");
  await page.getByRole("link", { name: "Teriyaki Chicken Casserole" }).click();
  await expect(page).toHaveURL(/\/recipe\/52772-teriyaki-chicken-casserole$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teriyaki Chicken Casserole");
  await expect(page.getByRole("heading", { name: "Method" })).toBeVisible();
});

test("short recipe URLs redirect to the full one", async ({ page }) => {
  await page.goto("/recipe/52772");
  await expect(page).toHaveURL(/\/recipe\/52772-teriyaki-chicken-casserole$/);
});

test("find recipes from what I have, and remember the list", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "What I have" }).click();
  const input = page.getByLabel("Add an ingredient you have");
  await input.fill("chicken");
  await input.press("Enter");
  await input.fill("garlic, tomato");
  await input.press("Enter");
  await expect(page.getByRole("list", { name: "Your ingredients" }).getByRole("listitem")).toHaveCount(3);
  await page.getByRole("button", { name: "Find recipes" }).click();
  await expect(page).toHaveURL(/have=chicken%2Cgarlic%2Ctomato/);
  const first = page.getByRole("list", { name: "Recipes" }).getByRole("listitem").first();
  await expect(first).toContainText("Chicken Handi");
  await expect(first).toContainText("Uses 3 things you have");

  // The list is kept for next time, and the recipe page ticks what you have.
  await page.goto("/recipe/52795-chicken-handi");
  await expect(page.getByRole("checkbox", { name: /Garlic/ })).toBeChecked();
  await expect(page.getByText("You have 3 of 16.")).toBeVisible();
});

test("scale amounts and tick ingredients", async ({ page }) => {
  await page.goto("/recipe/52772-teriyaki-chicken-casserole");
  await expect(page.getByText("3/4 cup", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "2 times the amounts" }).click();
  await expect(page.getByText("1½ cup", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "½ times the amounts" }).click();
  await expect(page.getByText("⅜ cup", { exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: /brown sugar/ }).check();
  await expect(page.getByText("You have 1 of 8.")).toBeVisible();
});

test("swap an ingredient", async ({ page }) => {
  await page.goto("/recipe/52772-teriyaki-chicken-casserole");
  await page.getByRole("button", { name: "Swap brown sugar" }).click();
  const dialog = page.getByRole("dialog", { name: "1/4 cup brown sugar" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Sample swap for brown sugar")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("ask the kitchen helper", async ({ page }) => {
  await page.goto("/recipe/52772-teriyaki-chicken-casserole");
  await page.getByRole("button", { name: "Make it spicier" }).click();
  const conversation = page.getByRole("list", { name: "Conversation" });
  await expect(conversation).toContainText("Make it spicier");
  await expect(conversation).toContainText("1 tsp chilli flakes");
  await page.getByRole("textbox", { name: "Your question" }).fill("Can I cook it without oil?");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(conversation).toContainText("2–3 tbsp water or stock");
});

test("save a recipe and remove it", async ({ page }) => {
  await page.goto("/recipe/52770-spaghetti-bolognese");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/saved");
  await expect(page.getByRole("link", { name: "Spaghetti Bolognese" })).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("heading", { name: "Nothing saved yet" })).toBeVisible();
});

test("nothing found offers an AI recipe", async ({ page }) => {
  await page.goto("/search?q=moon%20cheese%20pie");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nothing found for “moon cheese pie”");
  await page.getByRole("link", { name: "Write it with AI" }).click();
  await expect(page).toHaveURL(/\/create\?q=moon/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quick moon cheese pie");
  await expect(page.getByText("Written by AI for you")).toBeVisible();
  // AI recipes can be saved and opened again from this browser.
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.goto("/saved");
  await page.getByRole("link", { name: "Quick moon cheese pie" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quick moon cheese pie");
});

test("pasting a link opens the importer, which refuses private addresses", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Dish, ingredient or recipe link" }).fill("http://127.0.0.1/recipe");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/import\?url=http%3A%2F%2F127\.0\.0\.1%2Frecipe/);
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("That address isn't on the public internet.");
});

test("theme choice sticks", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) {
    await page.getByRole("button", { name: /Theme: Match device/ }).click(); // → light
    await page.getByRole("button", { name: /Theme: Light/ }).click(); // → dark
  } else {
    await page.getByRole("button", { name: "Dark theme" }).click();
  }
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
