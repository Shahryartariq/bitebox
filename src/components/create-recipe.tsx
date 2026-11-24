"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { GeneratedRecipe } from "@/lib/ai/schemas";
import { AiError, fetchAiRecipe } from "@/lib/client/ai";
import { useSaved } from "@/lib/client/storage";
import type { Recipe } from "@/lib/types";
import { RecipeView } from "./recipe-view";

function toRecipe(prompt: string, g: GeneratedRecipe): Recipe {
  return {
    source: { kind: "ai", prompt },
    title: g.title,
    summary: g.summary,
    cuisine: g.cuisine || undefined,
    servings: g.servings,
    totalTime: g.totalTime,
    tags: [],
    ingredients: g.ingredients,
    steps: g.steps,
    tips: g.tips,
  };
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; recipe: Recipe }
  | { status: "error"; message: string };

export function CreateRecipe({ prompt, have, savedKey }: { prompt: string; have: string[]; savedKey?: string }) {
  const router = useRouter();
  const { saved } = useSaved();
  const [state, setState] = useState<State>({ status: "idle" });
  const [draft, setDraft] = useState(prompt);
  const [attempt, setAttempt] = useState(0);
  const started = useRef<string | null>(null);

  // Opening a saved AI recipe: it lives only in this browser.
  const savedRecipe = savedKey ? saved.find((s) => s.key === savedKey)?.recipe : undefined;

  useEffect(() => {
    if (savedKey || !prompt) return;
    const runKey = `${prompt}|${have.join(",")}|${attempt}`;
    if (started.current === runKey) return;
    started.current = runKey;
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchAiRecipe(prompt, have, controller.signal)
      .then((g) => setState({ status: "done", recipe: toRecipe(prompt, g) }))
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setState({
          status: "error",
          message: error instanceof AiError ? error.message : "A recipe couldn't be written.",
        });
      });
    return () => {
      controller.abort();
      started.current = null;
    };
  }, [prompt, have, savedKey, attempt]);

  if (savedKey) {
    if (savedRecipe) return <RecipeView recipe={savedRecipe} />;
    return (
      <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
        <h1 className="text-5xl font-black">Recipe not found</h1>
        <p className="mt-4 text-muted">
          AI recipes are saved in the browser you saved them in. This one isn&apos;t here.
        </p>
        <Link href="/saved" className="btn btn-quiet mt-6">
          Back to saved recipes
        </Link>
      </div>
    );
  }

  if (state.status === "done") {
    return (
      <>
        <RecipeView recipe={state.recipe} />
        <div className="mx-auto mt-10 max-w-6xl px-4 sm:px-6" data-print="hide">
          <button type="button" className="btn btn-quiet" onClick={() => setAttempt((n) => n + 1)}>
            Write a different version
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6">
      <h1 className="text-5xl font-black sm:text-6xl">Write a recipe with AI</h1>
      <form
        className="mt-6 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const q = draft.trim();
          if (q)
            router.push(
              `/create?q=${encodeURIComponent(q)}${have.length ? `&have=${encodeURIComponent(have.join(","))}` : ""}`,
            );
        }}
      >
        <label htmlFor="ai-prompt" className="sr-only">
          What do you want to cook?
        </label>
        <input
          id="ai-prompt"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Chicken karahi for 4, not too spicy"
          maxLength={140}
          className="field"
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={state.status === "loading"}>
          Write recipe
        </button>
      </form>
      {have.length ? (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Using what you have">
          {have.map((h) => (
            <li key={h} className="tape">
              {h}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-10" aria-live="polite">
        {state.status === "loading" ? (
          <div role="status" className="space-y-4">
            <p className="font-semibold">Writing a recipe for “{prompt}”…</p>
            <div className="h-10 w-2/3 animate-pulse rounded-lg bg-surface-2" />
            <div className="h-4 w-full animate-pulse rounded bg-surface-2" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-surface-2" />
            <div className="h-4 w-4/6 animate-pulse rounded bg-surface-2" />
          </div>
        ) : null}
        {state.status === "error" ? (
          <div role="alert" className="rounded-xl border border-chili/50 p-5">
            <p>{state.message}</p>
            <button type="button" className="btn btn-quiet btn-sm mt-3" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </button>
          </div>
        ) : null}
        {state.status === "idle" && !prompt ? (
          <p className="max-w-prose text-muted">
            Describe a dish, a craving, or what&apos;s in your fridge. The recipe stays in your browser unless you save
            it.
          </p>
        ) : null}
      </div>
    </div>
  );
}
