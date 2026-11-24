"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RecipeRef } from "@/lib/ai/schemas";
import { recipeKey, usePantry, useSaved } from "@/lib/client/storage";
import { isFreeIngredient, pantryCovers, scaleMeasure } from "@/lib/ingredients";
import { sizedImage } from "@/lib/mealdb-map";
import { hostname, slugify } from "@/lib/text";
import type { Ingredient, Recipe } from "@/lib/types";
import { AdSlot } from "./ad-slot";
import { KitchenHelper } from "./kitchen-helper";
import { SwapDialog } from "./swap-dialog";

const SCALES = [
  { value: 0.5, label: "Half" },
  { value: 1, label: "Normal" },
  { value: 2, label: "Double" },
  { value: 3, label: "Triple" },
];

function toRef(recipe: Recipe): RecipeRef {
  const source = recipe.source;
  if (source.kind === "mealdb") return { kind: "mealdb", id: source.id };
  if (source.kind === "bitebox") return { kind: "bitebox", id: source.id };
  if (source.kind === "web") return { kind: "web", url: source.url };
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
  const source = recipe.source;
  if (source.kind === "mealdb") return `/recipe/${source.id}-${slugify(recipe.title)}`;
  if (source.kind === "bitebox") return `/recipe/${source.id}`;
  if (source.kind === "web") return `/import?url=${encodeURIComponent(source.url)}`;
  return `/create?saved=${encodeURIComponent(recipeKey(recipe))}`;
}

function Icon({ name }: { name: "clock" | "people" | "globe" | "bowl" }) {
  const paths = {
    clock: <path d="M10 5.5V10l3 2M17.5 10a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0z" />,
    people: (
      <path d="M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 0c-2.8 0-5 1.8-5 4.5V15h10v-1.5C12 10.8 9.8 9 7 9zm6-6.5a3 3 0 0 1 0 6m2 6.5h3v-1.5c0-2.3-1.6-4-3.8-4.4" />
    ),
    globe: (
      <path d="M17.5 10a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0zM2.5 10h15M10 2.5c2 2 3 4.6 3 7.5s-1 5.5-3 7.5c-2-2-3-4.6-3-7.5s1-5.5 3-7.5z" />
    ),
    bowl: (
      <path d="M2.5 9.5h15a7.5 7.5 0 0 1-15 0zM6 6.5c0-1.5 1-1.5 1-3M10 6.5c0-1.5 1-1.5 1-3M14 6.5c0-1.5 1-1.5 1-3" />
    ),
  };
  return (
    <svg
      viewBox="0 0 20 20"
      className="size-5 shrink-0 text-brand"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
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
  const image = recipe.source.kind === "web" ? recipe.image : sizedImage(recipe.image, "large");

  const facts = [
    recipe.totalTime ? { icon: "clock" as const, label: "Time", value: recipe.totalTime } : null,
    recipe.servings ? { icon: "people" as const, label: "Makes", value: recipe.servings } : null,
    recipe.cuisine ? { icon: "globe" as const, label: "Cuisine", value: recipe.cuisine } : null,
    recipe.category ? { icon: "bowl" as const, label: "Type", value: recipe.category } : null,
  ].filter((f): f is NonNullable<typeof f> => f !== null);

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
    <article className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <header className="grid items-center gap-8 md:grid-cols-2">
        <figure>
          {image ? (
            <img
              src={image}
              alt={recipe.title}
              width={1200}
              height={900}
              fetchPriority="high"
              referrerPolicy="no-referrer"
              className="aspect-[4/3] w-full rounded-3xl bg-surface-3 object-cover"
            />
          ) : (
            <div className="grid aspect-[4/3] w-full place-items-center rounded-3xl bg-surface-3 text-muted">
              No photo
            </div>
          )}
          {recipe.photoCredit ? (
            <figcaption className="mt-2 text-xs text-muted">
              Photo by{" "}
              <a href={recipe.photoCredit.url} className="underline hover:text-ink" rel="noopener">
                {recipe.photoCredit.name}
              </a>{" "}
              on{" "}
              <a
                href="https://unsplash.com/?utm_source=bitebox&utm_medium=referral"
                className="underline hover:text-ink"
                rel="noopener"
              >
                Unsplash
              </a>
            </figcaption>
          ) : null}
        </figure>

        <div>
          {isAi ? (
            <p className="chip chip-brand mb-4">Written by AI for you</p>
          ) : recipe.source.kind === "web" ? (
            <p className="mb-3 text-sm font-semibold text-muted">
              Imported from{" "}
              <a href={recipe.source.url} className="underline hover:text-ink" rel="noopener nofollow">
                {recipe.source.site}
              </a>
            </p>
          ) : null}
          <h1 className="text-4xl sm:text-5xl">{recipe.title}</h1>
          {recipe.summary && recipe.source.kind !== "mealdb" ? (
            <p className="mt-4 max-w-prose text-lg text-muted">{recipe.summary}</p>
          ) : null}
          {recipe.author ? <p className="mt-2 text-sm text-muted">Recipe by {recipe.author}</p> : null}

          {facts.length ? (
            <ul
              aria-label="Recipe facts"
              className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4"
            >
              {facts.map((f) => (
                <li key={f.label} className="flex items-start gap-2 rounded-2xl bg-surface-2 p-3">
                  <Icon name={f.icon} />
                  <span>
                    <span className="block text-xs font-semibold text-muted">{f.label}</span>
                    <span className="block font-bold leading-snug">{f.value}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

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
            <span role="status" className="text-sm font-semibold text-basil">
              {shareNote}
            </span>
          </div>
        </div>
      </header>

      <ol
        aria-label="How to use this recipe"
        className="mt-10 grid gap-3 rounded-2xl border border-line p-4 text-[0.95rem] sm:grid-cols-3"
        data-print="hide"
      >
        <li className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft font-bold">1</span>
          <span>
            <strong>Tick</strong> the ingredients you already have.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft font-bold">2</span>
          <span>
            Missing one? Tap <strong>Don&apos;t have it?</strong> to see what to use instead.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft font-bold">3</span>
          <span>
            Want it spicier, creamier or without oil?{" "}
            <a href="#ask-ai" className="font-bold text-brand underline">
              Ask AI
            </a>
            .
          </span>
        </li>
      </ol>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section aria-labelledby="ingredients-title" className="self-start rounded-3xl bg-surface-2 p-5 sm:p-6">
          <h2 id="ingredients-title" className="section-title">
            Ingredients
          </h2>
          <div className="mt-4 flex flex-wrap items-center gap-2" data-print="hide">
            <span id="amounts-label" className="text-sm font-semibold text-muted">
              Amounts:
            </span>
            <div role="group" aria-labelledby="amounts-label" className="flex flex-wrap gap-1">
              {SCALES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={scale === s.value}
                  onClick={() => setScale(s.value)}
                  className="rounded-full border border-line bg-surface px-3 py-1 text-sm font-bold text-muted hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          {countable.length ? (
            <p className="mt-3 text-sm font-semibold text-basil" data-print="hide" aria-live="polite">
              You have {haveCount} of {countable.length}.
            </p>
          ) : null}

          <ul className="mt-3 divide-y divide-line">
            {recipe.ingredients.map((ing, i) => {
              const id = `ing-${i}`;
              const measure = scaleMeasure(ing.measure, scale);
              return (
                <li key={`${ing.name}-${i}`} className="flex items-center gap-3 py-3">
                  <input
                    id={id}
                    type="checkbox"
                    checked={Boolean(checked[i])}
                    onChange={(e) => setOverrides((prev) => ({ ...prev, [i]: e.target.checked }))}
                    className="size-5 shrink-0 accent-[var(--basil)]"
                  />
                  <label htmlFor={id} className={`flex-1 ${checked[i] ? "text-muted line-through" : ""}`}>
                    {measure ? <span className="font-bold">{measure} </span> : null}
                    <span>{ing.name}</span>
                  </label>
                  {checked[i] ? null : (
                    <button
                      type="button"
                      onClick={() => setSwapFor({ ...ing, measure })}
                      className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-sm font-semibold text-brand hover:border-brand"
                      aria-label={`Don't have ${ing.name}?`}
                      data-print="hide"
                    >
                      Don&apos;t have it?
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <AdSlot slot={adSlot} className="mt-8" />
        </section>

        <section aria-labelledby="method-title">
          <h2 id="method-title" className="section-title">
            Method
          </h2>
          <ol className="mt-5 space-y-6">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-brand font-bold text-on-brand"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <p className="max-w-prose pt-1">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step}
                </p>
              </li>
            ))}
          </ol>
          {recipe.tips?.length ? (
            <div className="mt-8 rounded-2xl bg-brand-soft p-5">
              <h3 className="text-xl">Tips</h3>
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
                {hostname(recipe.sourceUrl)}
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

      <div className="mt-14">
        <KitchenHelper recipe={ref} title={recipe.title} />
      </div>

      <SwapDialog recipe={ref} ingredient={swapFor} onClose={() => setSwapFor(null)} />
    </article>
  );
}
