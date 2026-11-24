"use client";

import { useEffect, useRef, useState } from "react";
import type { RecipeRef, SubstituteResult } from "@/lib/ai/schemas";
import { AiError, fetchSubstitutes } from "@/lib/client/ai";
import type { Ingredient } from "@/lib/types";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; result: SubstituteResult }
  | { status: "error"; message: string };

const FIT_LABEL: Record<SubstituteResult["options"][number]["fit"], string> = {
  best: "Best match",
  good: "Works well",
  "in a pinch": "In a pinch",
};

export function SwapDialog({
  recipe,
  ingredient,
  onClose,
}: {
  recipe: RecipeRef;
  ingredient: Ingredient | null;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cache = useRef(new Map<string, SubstituteResult>());
  const [state, setState] = useState<State>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (ingredient && !dialog.open) dialog.showModal();
    if (!ingredient && dialog.open) dialog.close();
  }, [ingredient]);

  useEffect(() => {
    if (!ingredient) return;
    const key = `${ingredient.measure}|${ingredient.name}`;
    const cached = cache.current.get(key);
    if (cached) {
      setState({ status: "done", result: cached });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    fetchSubstitutes(recipe, ingredient, controller.signal)
      .then((result) => {
        cache.current.set(key, result);
        setState({ status: "done", result });
      })
      .catch((error: Error) => {
        if (error.name === "AbortError") return;
        setState({ status: "error", message: error instanceof AiError ? error.message : "Swaps couldn't be loaded." });
      });
    return () => controller.abort();
  }, [ingredient, recipe, attempt]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) dialogRef.current?.close();
      }}
      aria-labelledby="swap-title"
      className="m-auto w-[min(36rem,calc(100vw-2rem))] max-h-[85dvh] rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-black/50"
    >
      {ingredient ? (
        <div className="p-5 sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-muted">Out of</p>
              <h2 id="swap-title" className="mt-1 text-3xl font-extrabold">
                {[ingredient.measure, ingredient.name].filter(Boolean).join(" ")}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="grid size-10 shrink-0 place-items-center rounded-full border border-line hover:border-ink"
              aria-label="Close"
            >
              <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
                <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-5" aria-live="polite" aria-busy={state.status === "loading"}>
            {state.status === "loading" ? (
              <div className="space-y-3" role="status">
                <span className="sr-only">Finding swaps…</span>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-2" />
                ))}
              </div>
            ) : null}

            {state.status === "error" ? (
              <div role="alert" className="rounded-xl border border-chili/40 p-4">
                <p>{state.message}</p>
                <button type="button" className="btn btn-quiet btn-sm mt-3" onClick={() => setAttempt((n) => n + 1)}>
                  Try again
                </button>
              </div>
            ) : null}

            {state.status === "done" ? (
              <>
                <ol className="space-y-3">
                  {state.result.options.map((option, i) => (
                    <li key={i} className="rounded-xl border border-line p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-xl font-bold [font-stretch:88%]">{option.swap}</h3>
                        <span
                          className={`text-sm font-semibold ${option.fit === "best" ? "text-basil" : "text-muted"}`}
                        >
                          {FIT_LABEL[option.fit]}
                        </span>
                      </div>
                      <p className="mt-1 font-semibold">{option.amount}</p>
                      <p className="mt-1 text-[0.95rem]">{option.how}</p>
                      <p className="mt-1 text-sm text-muted">{option.effect}</p>
                    </li>
                  ))}
                </ol>
                {state.result.skip ? (
                  <p className="mt-4 text-[0.95rem]">
                    <strong>Leave it out?</strong> {state.result.skip}
                  </p>
                ) : null}
                {state.result.note ? (
                  <p className="mt-3 rounded-lg bg-surface-2 p-3 text-sm">
                    <strong>Note:</strong> {state.result.note}
                  </p>
                ) : null}
                <p className="mt-4 text-xs text-muted">
                  Suggested by AI. Check labels if you cook for someone with allergies.
                </p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
