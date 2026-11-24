"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RecipeRef } from "@/lib/ai/schemas";
import { recipeKey, usePantry, useSaved } from "@/lib/client/storage";
import { isFreeIngredient, pantryCovers, scaleMeasure } from "@/lib/ingredients";
import { sizedImage } from "@/lib/mealdb-map";
import { slugify } from "@/lib/text";
import type { Ingredient, Recipe } from "@/lib/types";
import { AdSlot } from "./ad-slot";
import { KitchenHelper } from "./kitchen-helper";
import { SwapDialog } from "./swap-dialog";

const SCALES = [
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 3, label: "3×" },
];

function toRef(recipe: Recipe): RecipeRef {
  if (recipe.source.kind === "mealdb") return { kind: "mealdb", id: recipe.source.id };
  if (recipe.source.kind === "web") return { kind: "web", url: recipe.source.url };
  return {
    kind: "ai",
    recipe: {
      title: recipe.title.slice(0, 120),
      summary: recipe.summary?.slice(0, 400),
      servings: recipe.servings?.slice(0, 60),
      ingredients: recipe.ingredients
        .slice(0, 40)
        .map((i) => ({ measure: i.measure.slice(0, 60), name: i.name.slice(0, 100) })),
      steps: recipe.steps.slice(0, 30).map((s) => s.slice(0, 600)),
    },
  };
}

function hrefFor(recipe: Recipe): string {
  if (recipe.source.kind === "mealdb") return `/recipe/${recipe.source.id}-${slugify(recipe.title)}`;
  if (recipe.source.kind === "web") return `/import?url=${encodeURIComponent(recipe.source.url)}`;
  return `/create?saved=${encodeURIComponent(recipeKey(recipe))}`;
}

export function RecipeView({ recipe, adSlot }: { recipe: Recipe; adSlot?: string }) {
  const ref = useMemo(() => toRef(recipe), [recipe]);
  const key = recipeKey(recipe);
  const { isSaved, toggle } = useSaved();
  const { pantry } = usePantry();
  const [scale, setScale] = useState(1);
  // Only what the cook ticked or unticked; the pantry list fills in the rest.
  const [overrides, setOverrides] = useState<Record<number, boolean>>({});
  const [swapFor, setSwapFor] = useState<Ingredient | null>(null);
  const [shareNote, setShareNote] = useState("");

  const fromPantry = useMemo(
    () => recipe.ingredients.map((ing) => pantry.some((p) => pantryCovers(p, ing.name))),
    [pantry, recipe.ingredients],
  );
  const checked = recipe.ingredients.map((_, i) => overrides[i] ?? fromPantry[i] ?? false);

  const countable = recipe.ingredients.map((ing, i) => ({ ing, i })).filter(({ ing }) => !isFreeIngredient(ing.name));
  const haveCount = countable.filter(({ i }) => checked[i]).length;
  const saved = isSaved(key);
  const isAi = recipe.source.kind === "ai";
  const image = recipe.source.kind === "mealdb" ? sizedImage(recipe.image, "large") : recipe.image;
  const meta = [recipe.cuisine, recipe.category, recipe.servings, recipe.totalTime].filter(Boolean);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: recipe.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareNote("Link copied");
    } catch (error) {
      if ((error as Error).name !== "AbortError") setShareNote("Couldn't share. Copy the address bar instead.");
    }
    setTimeout(() => setShareNote(""), 2500);
  }

  return (
    <article className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <header className="grid items-end gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="order-2 md:order-1">
          {isAi ? (
            <p className="tape mb-4 [--tilt:-1.5deg]">Written by AI for you</p>
          ) : recipe.source.kind === "web" ? (
            <p className="mb-3 text-sm font-semibold text-muted">
              Imported from{" "}
              <a href={recipe.source.url} className="underline hover:text-ink" rel="noopener nofollow">
                {recipe.source.site}
              </a>
            </p>
          ) : null}
          <h1 className="text-5xl font-black sm:text-6xl lg:text-7xl">{recipe.title}</h1>
          {meta.length ? (
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-semibold text-muted" aria-label="About this recipe">
              {meta.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
          {recipe.summary && recipe.source.kind !== "mealdb" ? (
            <p className="mt-4 max-w-prose text-lg">{recipe.summary}</p>
          ) : null}
          {recipe.author ? <p className="mt-2 text-sm text-muted">Recipe by {recipe.author}</p> : null}

          <div className="mt-6 flex flex-wrap items-center gap-2" data-print="hide">
            <button
              type="button"
              aria-pressed={saved}
              onClick={() =>
                toggle({
                  key,
                  title: recipe.title,
                  image: recipe.image,
                  href: hrefFor(recipe),
                  recipe: isAi ? recipe : undefined,
                })
              }
              className={`btn ${saved ? "btn-quiet border-basil text-basil" : "btn-primary"}`}
            >
              <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
                <path
                  d="M5 2.5h10a1 1 0 0 1 1 1V18l-6-3.6L4 18V3.5a1 1 0 0 1 1-1z"
                  fill={saved ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              {saved ? "Saved" : "Save"}
            </button>
            <button type="button" onClick={share} className="btn btn-quiet">
              Share
            </button>
            <button type="button" onClick={() => window.print()} className="btn btn-quiet">
              Print
            </button>
            {recipe.video ? (
              <a href={recipe.video} className="btn btn-quiet" rel="noopener">
                Watch video
              </a>
            ) : null}
            <a href="#kitchen-helper" className="btn btn-quiet">
              Ask AI
            </a>
            <span role="status" className="text-sm font-semibold text-basil">
              {shareNote}
            </span>
          </div>
        </div>
        <div className="order-1 md:order-2">
          {image ? (
            <img
              src={image}
              alt={recipe.title}
              width={700}
              height={700}
              fetchPriority="high"
              referrerPolicy="no-referrer"
              className="aspect-[4/3] w-full rounded-[14px] bg-surface-2 object-cover md:aspect-square"
            />
          ) : (
            <div className="grid aspect-[4/3] w-full place-items-center rounded-[14px] bg-surface-2 text-muted md:aspect-square">
              <span className="font-display text-2xl font-bold">No photo</span>
            </div>
          )}
        </div>
      </header>

      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="ingredients-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="ingredients-title" className="text-4xl font-extrabold">
              Ingredients
            </h2>
            <div
              role="group"
              aria-label="Amounts"
              className="flex rounded-full border border-line bg-surface p-0.5"
              data-print="hide"
            >
              {SCALES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={scale === s.value}
                  aria-label={`${s.label.replace("×", "")} times the amounts`}
                  onClick={() => setScale(s.value)}
                  className="min-w-11 rounded-full px-3 py-1.5 text-sm font-bold text-muted aria-pressed:bg-ink aria-pressed:text-bg"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-sm text-muted" data-print="hide">
            Tick what you have. Tap <strong className="text-ink">Swap</strong> if you&apos;re out of something.
            {countable.length ? (
              <span className="ml-1 font-semibold text-basil">
                You have {haveCount} of {countable.length}.
              </span>
            ) : null}
          </p>

          <ul className="mt-5 divide-y divide-line border-y border-line">
            {recipe.ingredients.map((ing, i) => {
              const id = `ing-${i}`;
              const measure = scaleMeasure(ing.measure, scale);
              return (
                <li key={`${ing.name}-${i}`} className="flex items-center gap-3 py-2.5">
                  <input
                    id={id}
                    type="checkbox"
                    checked={Boolean(checked[i])}
                    onChange={(e) => setOverrides((prev) => ({ ...prev, [i]: e.target.checked }))}
                    className="size-5 shrink-0 accent-[var(--basil)]"
                  />
                  <label htmlFor={id} className={`flex-1 ${checked[i] ? "text-muted" : ""}`}>
                    {measure ? <span className="font-bold">{measure} </span> : null}
                    <span>{ing.name}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSwapFor({ ...ing, measure })}
                    className="shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-chili hover:bg-surface-2"
                    aria-label={`Swap ${ing.name}`}
                    data-print="hide"
                  >
                    Swap
                  </button>
                </li>
              );
            })}
          </ul>
          <AdSlot slot={adSlot} className="mt-8" />
        </section>

        <section aria-labelledby="method-title">
          <h2 id="method-title" className="text-4xl font-extrabold">
            Method
          </h2>
          <ol className="mt-5 space-y-5">
            {recipe.steps.map((step, i) => (
              <li key={i} className="grid grid-cols-[2.25rem_1fr] gap-3">
                <span
                  className="font-display text-2xl font-black leading-7 text-chili [font-stretch:70%]"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <p className="max-w-prose">{step}</p>
              </li>
            ))}
          </ol>
          {recipe.tips?.length ? (
            <div className="mt-8 rounded-xl border border-line p-5">
              <h3 className="text-2xl font-bold">Tips</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {recipe.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {recipe.sourceUrl && recipe.source.kind !== "web" ? (
            <p className="mt-8 text-sm text-muted">
              Original recipe:{" "}
              <a href={recipe.sourceUrl} className="underline hover:text-ink" rel="noopener nofollow">
                {new URL(recipe.sourceUrl).hostname.replace(/^www\./, "")}
              </a>
            </p>
          ) : null}
          {recipe.source.kind === "web" ? (
            <p className="mt-8 text-sm text-muted">
              This recipe belongs to{" "}
              <a href={recipe.source.url} className="underline hover:text-ink" rel="noopener nofollow">
                {recipe.source.site}
              </a>
              . Bitebox shows it so you can cook from it and ask questions; it isn&apos;t stored or listed here.
            </p>
          ) : null}
        </section>
      </div>

      {recipe.tags.length ? (
        <ul className="mt-12 flex flex-wrap gap-2" aria-label="Tags">
          {recipe.tags.map((t) => (
            <li key={t}>
              <Link
                href={`/search?q=${encodeURIComponent(t)}`}
                className="rounded-full border border-line px-3 py-1 text-sm hover:border-ink"
              >
                {t}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-16 border-t border-line pt-12">
        <KitchenHelper recipe={ref} title={recipe.title} />
      </div>

      <SwapDialog recipe={ref} ingredient={swapFor} onClose={() => setSwapFor(null)} />
    </article>
  );
}
