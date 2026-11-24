import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { RecipeCard, RecipeGrid } from "@/components/recipe-card";
import { RecipeView } from "@/components/recipe-view";
import { getCatalog, getRecipe } from "@/lib/mealdb";
import { idFromSlug, sizedImage } from "@/lib/mealdb-map";
import { breadcrumbJsonLd, recipeJsonLd } from "@/lib/seo";
import { slugify, truncate } from "@/lib/text";
import type { RecipeSummary } from "@/lib/types";

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  // Pages are built the first time someone opens them, then cached.
  return [];
}

type Params = Promise<{ slug: string }>;

async function load(slug: string) {
  const id = idFromSlug(slug);
  if (!id) return null;
  const recipe = await getRecipe(id);
  if (!recipe) return null;
  return { id, recipe, canonical: `/recipe/${id}-${slugify(recipe.title)}` };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug).catch(() => null);
  if (!data) return { title: "Recipe not found" };
  const { recipe, canonical } = data;
  const image = sizedImage(recipe.image, "large");
  const description = truncate(recipe.summary ?? `${recipe.title} recipe`, 160);
  return {
    title: `${recipe.title} recipe`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: recipe.title,
      description,
      url: canonical,
      images: image ? [{ url: image, width: 700, height: 700, alt: recipe.title }] : undefined,
    },
  };
}

async function related(id: string, cuisine?: string, category?: string): Promise<RecipeSummary[]> {
  try {
    const { records } = await getCatalog();
    const others = records.filter((r) => r.summary.id !== id);
    const sameCuisine = others.filter((r) => cuisine && r.summary.cuisine === cuisine);
    const sameCategory = others.filter(
      (r) => category && r.summary.category === category && r.summary.cuisine !== cuisine,
    );
    return [...sameCuisine, ...sameCategory].slice(0, 3).map((r) => r.summary);
  } catch {
    return [];
  }
}

export default async function RecipePage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { id, recipe, canonical } = data;
  if (`/recipe/${slug}` !== canonical) permanentRedirect(canonical);

  const more = await related(id, recipe.cuisine, recipe.category);
  const crumbs = [
    { name: "Home", path: "/" },
    ...(recipe.cuisine ? [{ name: recipe.cuisine, path: `/cuisine/${slugify(recipe.cuisine)}` }] : []),
    { name: recipe.title, path: canonical },
  ];

  return (
    <>
      <JsonLd data={recipeJsonLd(recipe, canonical)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <nav aria-label="Breadcrumb" className="mx-auto max-w-6xl px-4 pt-6 text-sm text-muted sm:px-6" data-print="hide">
        <ol className="flex flex-wrap gap-x-2">
          {crumbs.slice(0, -1).map((c) => (
            <li key={c.path} className="after:ml-2 after:content-['/']">
              <Link href={c.path} className="hover:text-ink hover:underline">
                {c.name}
              </Link>
            </li>
          ))}
          <li aria-current="page" className="truncate">
            {recipe.title}
          </li>
        </ol>
      </nav>
      <RecipeView recipe={recipe} adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECIPE} />
      {more.length ? (
        <section aria-labelledby="more-title" className="mx-auto mt-20 max-w-6xl px-4 sm:px-6" data-print="hide">
          <h2 id="more-title" className="mb-6 text-4xl font-extrabold">
            Cook this next
          </h2>
          <RecipeGrid label="More recipes">
            {more.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </RecipeGrid>
        </section>
      ) : null}
    </>
  );
}
