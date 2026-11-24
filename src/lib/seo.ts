import { sizedImage } from "./mealdb-map";
import { absoluteUrl, SITE_NAME } from "./site";
import type { Recipe } from "./types";

/** schema.org Recipe data so search engines can show rich results. */
export function recipeJsonLd(recipe: Recipe, path: string) {
  const image = recipe.source.kind === "mealdb" ? sizedImage(recipe.image, "large") : recipe.image;
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.summary,
    image: image ? [image] : undefined,
    url: absoluteUrl(path),
    recipeCuisine: recipe.cuisine,
    recipeCategory: recipe.category,
    keywords: recipe.tags.length ? recipe.tags.join(", ") : undefined,
    recipeIngredient: recipe.ingredients.map((i) => [i.measure, i.name].filter(Boolean).join(" ")),
    recipeInstructions: recipe.steps.map((text, i) => ({ "@type": "HowToStep", position: i + 1, text })),
    isBasedOn: recipe.sourceUrl,
    publisher: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Safe to drop into a <script> tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}
