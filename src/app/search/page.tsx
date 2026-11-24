import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdSlot } from "@/components/ad-slot";
import { RecipeCard, RecipeGrid } from "@/components/recipe-card";
import { SearchBox } from "@/components/search-box";
import { getCatalog } from "@/lib/mealdb";
import { matchPantry, parsePantryInput, searchMeals } from "@/lib/search";
import { looksLikeUrl, toUrl } from "@/lib/text";

type Params = Promise<{ q?: string | string[]; have?: string | string[] }>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 2000) ?? "";

export async function generateMetadata({ searchParams }: { searchParams: Params }): Promise<Metadata> {
  const { q, have } = await searchParams;
  const query = first(q).trim();
  const items = parsePantryInput(first(have));
  const title = items.length ? `Recipes with ${items.join(", ")}` : query ? `${query} recipes` : "Search recipes";
  return {
    title,
    alternates: { canonical: "/search" },
    // Search result pages are endless variations; keep them out of search engines.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Params }) {
  const { q, have } = await searchParams;
  const query = first(q).trim();
  const items = parsePantryInput(first(have));

  if (query && looksLikeUrl(query)) redirect(`/import?url=${encodeURIComponent(toUrl(query))}`);

  let records: Awaited<ReturnType<typeof getCatalog>>["records"] = [];
  let failed = false;
  try {
    records = (await getCatalog()).records;
  } catch (error) {
    console.error("[search] catalog unavailable", error);
    failed = true;
  }

  const pantryHits = items.length ? matchPantry(records, items) : [];
  const hits = !items.length && query ? searchMeals(records, query) : [];
  const count = items.length ? pantryHits.length : hits.length;
  const searched = Boolean(query || items.length);
  const aiPrompt = items.length ? `something with ${items.join(", ")}` : query;
  const aiHref = `/create?q=${encodeURIComponent(aiPrompt)}${items.length ? `&have=${encodeURIComponent(items.join(","))}` : ""}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <div className="max-w-3xl">
        <SearchBox
          key={`${query}|${items.join(",")}`}
          initialQuery={query}
          initialMode={items.length ? "have" : "dish"}
          size="compact"
        />
      </div>

      {searched ? (
        <h1 className="mt-10 text-4xl font-extrabold sm:text-5xl" aria-live="polite">
          {failed
            ? "Recipes couldn't load"
            : count
              ? items.length
                ? `${count} ${count === 1 ? "recipe uses" : "recipes use"} what you have`
                : `${count} ${count === 1 ? "recipe" : "recipes"} for “${query}”`
              : `Nothing found for “${items.length ? items.join(", ") : query}”`}
        </h1>
      ) : (
        <h1 className="mt-10 text-4xl font-extrabold sm:text-5xl">Search recipes</h1>
      )}

      {failed ? (
        <p className="mt-3 max-w-prose text-muted">
          The recipe library didn&apos;t answer. Try again in a minute, or let AI write a recipe now.
        </p>
      ) : null}

      {searched && (failed || count < 4) ? (
        <div className="mt-6 flex max-w-3xl flex-col gap-4 rounded-[18px] border-2 border-ink bg-surface p-6 sm:flex-row sm:items-center">
          <div className="flex-1">
            <h2 className="text-2xl font-extrabold">{count ? "Want something different?" : "Let AI write it"}</h2>
            <p className="mt-1 text-muted">
              Bitebox can write a recipe for “{aiPrompt}” in a few seconds. You can also paste a link from any recipe
              site into the search box.
            </p>
          </div>
          <Link href={aiHref} className="btn btn-primary shrink-0">
            Write it with AI
          </Link>
        </div>
      ) : null}

      {!searched ? (
        <p className="mt-3 max-w-prose text-muted">
          Search by dish, ingredient, cuisine or course. Switch to <strong>What I have</strong> to find recipes that use
          the ingredients in your kitchen.
        </p>
      ) : null}

      <div className="mt-10">
        {items.length && pantryHits.length ? (
          <RecipeGrid label="Recipes">
            {pantryHits.map((hit, i) => (
              <RecipeCard
                key={hit.recipe.id}
                recipe={hit.recipe}
                have={hit.have}
                missing={hit.missing}
                priority={i < 3}
              />
            ))}
          </RecipeGrid>
        ) : null}
        {hits.length ? (
          <RecipeGrid label="Recipes">
            {hits.map((hit, i) => (
              <RecipeCard key={hit.recipe.id} recipe={hit.recipe} priority={i < 3} />
            ))}
          </RecipeGrid>
        ) : null}
      </div>
      {count > 6 ? <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_SEARCH} className="mt-12" /> : null}
    </div>
  );
}
