import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { RecipeView } from "@/components/recipe-view";
import { SearchBox } from "@/components/search-box";
import { importRecipe, type ImportResult } from "@/lib/import/import-recipe";
import { checkAiLimits } from "@/lib/ratelimit";
import { hostname } from "@/lib/text";

export const metadata: Metadata = {
  title: "Import a recipe",
  description: "Paste a link from any recipe site to cook from it on Bitebox and ask the AI kitchen helper about it.",
  robots: { index: false, follow: false },
};

type Params = Promise<{ url?: string | string[] }>;

export default async function ImportPage({ searchParams }: { searchParams: Params }) {
  const raw = (await searchParams).url;
  const url = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, 2000);

  if (!url) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
        <h1 className="text-4xl sm:text-5xl">Bring a recipe from anywhere</h1>
        <p className="mt-4 max-w-prose text-lg text-muted">
          Paste a link from a recipe site. Bitebox reads the ingredients and method, so you can scale it, tick off what
          you have, and ask the kitchen helper for swaps.
        </p>
        <div className="mt-8">
          <SearchBox size="compact" />
        </div>
      </div>
    );
  }

  const limit = await checkAiLimits(await headers(), "import");
  let result: ImportResult;
  if (!limit.ok) {
    result = {
      ok: false,
      code: "network",
      message: "You've imported a lot of links in a short time. Try again in a few minutes.",
    };
  } else {
    result = await importRecipe(url);
  }

  if (result.ok) {
    return <RecipeView recipe={result.recipe} adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_RECIPE} />;
  }

  const site = hostname(url);
  const aiPrompt = result.code === "no-recipe" && result.title ? result.title : undefined;
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">That link didn&apos;t work</h1>
      <p className="mt-4 text-lg" role="alert">
        {result.message}
      </p>
      <p className="mt-2 break-all text-sm text-muted">{site}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        {aiPrompt ? (
          <Link href={`/create?q=${encodeURIComponent(aiPrompt)}`} className="btn btn-primary">
            Write “{aiPrompt.slice(0, 40)}” with AI
          </Link>
        ) : null}
        <a href={url.startsWith("http") ? url : `https://${url}`} className="btn btn-quiet" rel="noopener nofollow">
          Open the page
        </a>
        <Link href="/search" className="btn btn-quiet">
          Search Bitebox instead
        </Link>
      </div>
      {result.code === "no-recipe" || result.code === "http-error" ? (
        <p className="mt-8 max-w-prose text-sm text-muted">
          Bitebox reads the recipe details that most food blogs and recipe sites publish for search engines. Some sites
          don&apos;t publish them, or block apps from reading their pages.
        </p>
      ) : null}
    </div>
  );
}
