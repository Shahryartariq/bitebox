export const SITE_NAME = "Bitebox";
export const SITE_TAGLINE = "Find a recipe. Fix what's missing.";
export const SITE_DESCRIPTION =
  "Search hundreds of recipes, cook with what's already in your kitchen, import a recipe from any link, and ask the AI kitchen helper for swaps when you're out of something.";

export function siteUrl(): string {
  const explicit = process.env.SITE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export function absoluteUrl(path: string): string {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}
