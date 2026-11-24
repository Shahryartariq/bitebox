import Link from "next/link";
import { RecipeCard, RecipeGrid } from "@/components/recipe-card";
import { SearchBox } from "@/components/search-box";
import { PAKISTANI_RECIPES } from "@/data/pakistani";
import { LOCAL_CUISINE, unsplashUrl } from "@/lib/local-recipes";
import { getCatalog, getCategories, getCuisines, getDailyPicks } from "@/lib/mealdb";
import { SITE_DESCRIPTION } from "@/lib/site";
import type { Category, Cuisine, RecipeSummary } from "@/lib/types";

export const revalidate = 3600;

export const metadata = {
  alternates: { canonical: "/" },
  description: SITE_DESCRIPTION,
};

const pakistani: RecipeSummary[] = PAKISTANI_RECIPES.map((r) => ({
  id: r.id,
  slug: r.id,
  title: r.title,
  image: unsplashUrl(r.photo.id, 700),
  cuisine: LOCAL_CUISINE,
  category: r.category,
  minutes: r.minutes,
}));

const COLLAGE = ["pk-chicken-biryani", "pk-chicken-karahi", "pk-chicken-tikka"]
  .map((id) => PAKISTANI_RECIPES.find((r) => r.id === id)!)
  .filter(Boolean);

const STEPS = [
  {
    title: "Find a recipe",
    text: "Search by dish or ingredient, pick a cuisine, or paste a link from any recipe website.",
    icon: <path d="M9 15A6 6 0 1 0 9 3a6 6 0 0 0 0 12zm4.5-1.5L18 18" />,
  },
  {
    title: "Tick what you have",
    text: "Every recipe shows what you already have and what you still need to buy.",
    icon: <path d="M3.5 10.5l4 4 9-9" />,
  },
  {
    title: "Missing something? Ask AI",
    text: "Get a swap for any ingredient, or make the dish spicier, creamier, or without oil or salt.",
    icon: (
      <path d="M10 2.5l1.8 4.7 4.7 1.8-4.7 1.8L10 15.5l-1.8-4.7-4.7-1.8 4.7-1.8zM16 13.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    ),
  },
];

async function loadHome(): Promise<{
  picks: RecipeSummary[];
  cuisines: Cuisine[];
  categories: Category[];
  total: number;
} | null> {
  try {
    const [picks, cuisines, categories, catalog] = await Promise.all([
      getDailyPicks(12),
      getCuisines(),
      getCategories(),
      getCatalog(),
    ]);
    return {
      picks: picks.filter((p) => p.cuisine !== LOCAL_CUISINE).slice(0, 8),
      cuisines,
      categories,
      total: catalog.records.length,
    };
  } catch (error) {
    console.error("[home] recipes unavailable", error);
    return null;
  }
}

export default async function HomePage() {
  const data = await loadHome();
  const total = data?.total ? `${Math.floor(data.total / 10) * 10}+` : "hundreds of";
  const cuisines = data
    ? [
        ...data.cuisines.filter((c) => c.name === LOCAL_CUISINE),
        ...data.cuisines.filter((c) => c.name !== LOCAL_CUISINE),
      ]
    : [];

  return (
    <>
      <section className="bg-surface-2">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:px-6 md:pt-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div>
            <h1 className="text-[clamp(2.4rem,6vw,4rem)]">Find a recipe for tonight</h1>
            <p className="mt-4 max-w-xl text-lg text-muted">
              Search {total} recipes from around the world, including Pakistani favourites. Missing an ingredient? AI
              tells you what to use instead.
            </p>
            <div className="mt-7 max-w-2xl">
              <SearchBox showPopular />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3" aria-hidden="true">
            <div className="relative row-span-2 overflow-hidden rounded-2xl bg-surface-3">
              <img
                src={unsplashUrl(COLLAGE[0]!.photo.id, 800)}
                alt=""
                width={800}
                height={1000}
                fetchPriority="high"
                className="absolute inset-0 size-full object-cover"
              />
            </div>
            {COLLAGE.slice(1, 3).map((r) => (
              <img
                key={r.id}
                src={unsplashUrl(r.photo.id, 500)}
                alt=""
                width={500}
                height={500}
                className="aspect-square size-full rounded-2xl bg-surface-3 object-cover"
              />
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <h2 id="how-title" className="section-title">
          How Bitebox works
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, n) => (
            <li key={step.title} className="flex gap-4 rounded-2xl border border-line p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                <svg
                  viewBox="0 0 20 20"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {step.icon}
                </svg>
              </span>
              <div>
                <h3 className="text-lg">
                  <span className="sr-only">Step {n + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-1 text-[0.95rem] text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="pk-title" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="pk-title" className="section-title">
              Pakistani favourites
            </h2>
            <p className="mt-1 text-muted">Biryani, karahi, nihari and more, written and tested for home kitchens.</p>
          </div>
          <Link href="/cuisine/pakistan" className="btn btn-quiet btn-sm">
            See all {pakistani.length} Pakistani recipes
          </Link>
        </div>
        <RecipeGrid label="Pakistani favourites" columns={4}>
          {pakistani.slice(0, 8).map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </RecipeGrid>
      </section>

      {data ? (
        <>
          <section aria-labelledby="picks-title" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="picks-title" className="section-title">
                  Today&apos;s picks
                </h2>
                <p className="mt-1 text-muted">A new selection from around the world every day.</p>
              </div>
              <Link href="/search" className="btn btn-quiet btn-sm">
                Browse all recipes
              </Link>
            </div>
            <RecipeGrid label="Today's picks" columns={4}>
              {data.picks.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </RecipeGrid>
          </section>

          <section aria-labelledby="types-title" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
            <h2 id="types-title" className="section-title">
              Browse by type
            </h2>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {data.categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="flex h-full flex-col items-center rounded-2xl bg-surface-2 px-2 pb-3 pt-3 text-center hover:bg-surface-3"
                  >
                    {c.image ? (
                      <img
                        src={c.image}
                        alt=""
                        width={160}
                        height={100}
                        loading="lazy"
                        className="h-14 w-auto object-contain"
                      />
                    ) : null}
                    <span className="mt-1 font-bold">{c.name}</span>
                    <span className="text-xs text-muted">
                      {c.count} {c.count === 1 ? "recipe" : "recipes"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="cuisines-title" className="mx-auto mt-16 max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="cuisines-title" className="section-title">
                Cook around the world
              </h2>
              <Link href="/cuisines" className="btn btn-quiet btn-sm">
                All {cuisines.length} cuisines
              </Link>
            </div>
            <ul className="mt-6 columns-2 gap-x-8 sm:columns-3 lg:columns-4">
              {cuisines.slice(0, 24).map((c) => (
                <li key={c.slug} className="break-inside-avoid border-b border-line">
                  <Link
                    href={`/cuisine/${c.slug}`}
                    className="flex items-baseline justify-between gap-3 py-2.5 hover:text-brand"
                  >
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-sm text-muted">{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <p className="mx-auto mt-12 max-w-6xl px-4 text-muted sm:px-6">
          The world recipe library isn&apos;t answering right now. Pakistani recipes still work, and you can paste a
          recipe link above or ask AI for a recipe.
        </p>
      )}
    </>
  );
}
