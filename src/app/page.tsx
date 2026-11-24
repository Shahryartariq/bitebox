import Link from "next/link";
import { RecipeCard, RecipeGrid } from "@/components/recipe-card";
import { SearchBox } from "@/components/search-box";
import { getCatalog, getCategories, getCuisines, getDailyPicks } from "@/lib/mealdb";
import { SITE_DESCRIPTION } from "@/lib/site";
import type { Category, Cuisine, RecipeSummary } from "@/lib/types";

export const revalidate = 3600;

export const metadata = {
  alternates: { canonical: "/" },
  description: SITE_DESCRIPTION,
};

// Standard kitchen swaps, written by hand: a preview of what the AI helper does on every recipe.
const SWAPS = [
  { out: "No buttermilk", use: "1 cup milk + 1 tbsp lemon juice, rested 5 minutes" },
  { out: "No cream", use: "Greek yogurt, stirred in off the heat so it doesn't split" },
  { out: "No egg for baking", use: "1 tbsp ground flax + 3 tbsp water, rested 5 minutes" },
  { out: "No fresh garlic", use: "⅛ tsp garlic powder for each clove" },
];

async function loadHome(): Promise<{
  picks: RecipeSummary[];
  cuisines: Cuisine[];
  categories: Category[];
  total: number;
} | null> {
  try {
    const [picks, cuisines, categories, catalog] = await Promise.all([
      getDailyPicks(6),
      getCuisines(),
      getCategories(),
      getCatalog(),
    ]);
    return { picks, cuisines, categories, total: catalog.records.length };
  } catch (error) {
    console.error("[home] recipes unavailable", error);
    return null;
  }
}

export default async function HomePage() {
  const data = await loadHome();
  const total = data?.total ? `${Math.floor(data.total / 10) * 10}+` : "hundreds of";

  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:items-center">
        <div>
          <h1 className="text-[clamp(3.4rem,10vw,7.5rem)] font-black leading-[0.86] [font-stretch:62%]">
            What&apos;s for dinner?
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg text-muted">
            Search {total} recipes, cook from what&apos;s already in your kitchen, or paste a link from any recipe site.
            Out of something? The AI kitchen helper finds a swap.
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchBox />
          </div>
        </div>

        <aside aria-labelledby="swaps-title" className="rounded-[18px] border-2 border-ink bg-surface p-6 sm:p-7">
          <h2 id="swaps-title" className="text-3xl font-extrabold">
            Out of something?
          </h2>
          <p className="mt-1 text-sm text-muted">Swaps like these are one tap away on every recipe.</p>
          <ul className="mt-5 space-y-4">
            {SWAPS.map((swap) => (
              <li key={swap.out}>
                <span className="tape">{swap.out}</span>
                <p className="mt-1.5 pl-1 text-[0.95rem]">{swap.use}</p>
              </li>
            ))}
          </ul>
        </aside>
      </section>

      {data ? (
        <>
          <section aria-labelledby="picks-title" className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-6 flex items-end justify-between gap-4">
              <h2 id="picks-title" className="text-4xl font-extrabold sm:text-5xl">
                Today&apos;s picks
              </h2>
              <Link href="/search" className="font-semibold underline hover:text-chili">
                Browse all
              </Link>
            </div>
            <RecipeGrid label="Today's picks">
              {data.picks.map((recipe, i) => (
                <RecipeCard key={recipe.id} recipe={recipe} priority={i < 3} />
              ))}
            </RecipeGrid>
          </section>

          <section aria-labelledby="courses-title" className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
            <h2 id="courses-title" className="text-4xl font-extrabold sm:text-5xl">
              Pick a course
            </h2>
            <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {data.categories.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="flex h-full flex-col items-center rounded-xl border border-line bg-surface px-2 pb-3 pt-2 text-center hover:border-ink"
                  >
                    {c.image ? (
                      <img
                        src={c.image}
                        alt=""
                        width={160}
                        height={100}
                        loading="lazy"
                        className="h-16 w-auto object-contain"
                      />
                    ) : null}
                    <span className="mt-1 font-semibold">{c.name}</span>
                    <span className="text-xs text-muted">
                      {c.count} {c.count === 1 ? "recipe" : "recipes"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="cuisines-title" className="mx-auto mt-20 max-w-6xl px-4 sm:px-6">
            <div className="flex items-end justify-between gap-4">
              <h2 id="cuisines-title" className="text-4xl font-extrabold sm:text-5xl">
                Cook around the world
              </h2>
              <Link href="/cuisines" className="font-semibold underline hover:text-chili">
                All {data.cuisines.length} cuisines
              </Link>
            </div>
            <ul className="mt-6 columns-2 gap-x-8 sm:columns-3 lg:columns-4">
              {data.cuisines.slice(0, 24).map((c) => (
                <li key={c.slug} className="break-inside-avoid border-b border-line">
                  <Link
                    href={`/cuisine/${c.slug}`}
                    className="flex items-baseline justify-between gap-3 py-2 hover:text-chili"
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
        <p className="mx-auto max-w-6xl px-4 text-muted sm:px-6">
          The recipe library is taking a break. You can still paste a recipe link above or ask AI for a recipe.
        </p>
      )}
    </>
  );
}
