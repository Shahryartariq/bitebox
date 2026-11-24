import Link from "next/link";
import type { RecipeSummary } from "@/lib/types";
import { JsonLd } from "./json-ld";
import { RecipeCard, RecipeGrid } from "./recipe-card";
import { breadcrumbJsonLd } from "@/lib/seo";

export function ListingPage({
  title,
  intro,
  recipes,
  crumbs,
  banner,
}: {
  title: string;
  intro: string;
  recipes: RecipeSummary[];
  crumbs: Array<{ name: string; path: string }>;
  banner?: { src: string; credit: { name: string; url: string } };
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <ol className="flex flex-wrap gap-x-2">
          {crumbs.slice(0, -1).map((c) => (
            <li key={c.path} className="after:ml-2 after:content-['/']">
              <Link href={c.path} className="hover:text-ink hover:underline">
                {c.name}
              </Link>
            </li>
          ))}
          <li aria-current="page">{crumbs[crumbs.length - 1]?.name}</li>
        </ol>
      </nav>
      {banner ? (
        <figure className="mt-5">
          <img
            src={banner.src}
            alt=""
            width={1600}
            height={600}
            fetchPriority="high"
            className="aspect-[3/1] w-full rounded-3xl object-cover sm:aspect-[4/1]"
          />
          <figcaption className="mt-2 text-xs text-muted">
            Photo by{" "}
            <a href={banner.credit.url} className="underline hover:text-ink" rel="noopener">
              {banner.credit.name}
            </a>{" "}
            on{" "}
            <a href="https://unsplash.com/?utm_source=bitebox&utm_medium=referral" className="underline" rel="noopener">
              Unsplash
            </a>
          </figcaption>
        </figure>
      ) : null}
      <h1 className="mt-6 text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-prose text-lg text-muted">{intro}</p>
      <div className="mt-10">
        <RecipeGrid label={title}>
          {recipes.map((r, i) => (
            <RecipeCard key={r.id} recipe={r} priority={i < 3} />
          ))}
        </RecipeGrid>
      </div>
    </div>
  );
}
