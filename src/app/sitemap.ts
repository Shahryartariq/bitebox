import type { MetadataRoute } from "next";
import { getCatalog, getCategories, getCuisines } from "@/lib/mealdb";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/cuisines"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/about"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
  ];
  try {
    const [{ records }, cuisines, categories] = await Promise.all([getCatalog(), getCuisines(), getCategories()]);
    for (const c of cuisines)
      pages.push({ url: absoluteUrl(`/cuisine/${c.slug}`), changeFrequency: "weekly", priority: 0.6 });
    for (const c of categories)
      pages.push({ url: absoluteUrl(`/category/${c.slug}`), changeFrequency: "weekly", priority: 0.6 });
    for (const r of records)
      pages.push({ url: absoluteUrl(`/recipe/${r.summary.slug}`), changeFrequency: "monthly", priority: 0.8 });
  } catch (error) {
    console.error("[sitemap] recipes unavailable", error);
  }
  return pages;
}
