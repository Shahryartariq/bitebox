"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { usePantry } from "@/lib/client/storage";
import { parsePantryInput } from "@/lib/search";
import { looksLikeUrl, toUrl } from "@/lib/text";

type Mode = "dish" | "have";

const POPULAR = ["Biryani", "Chicken karahi", "Nihari", "Pasta", "Daal", "Dessert"];

export function SearchBox({
  initialMode = "dish",
  initialQuery = "",
  size = "hero",
  showPopular = false,
}: {
  initialMode?: Mode;
  initialQuery?: string;
  size?: "hero" | "compact";
  showPopular?: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [query, setQuery] = useState(initialQuery);
  const [draft, setDraft] = useState("");
  const { pantry, add, remove, clear } = usePantry();
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const hero = size === "hero";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (mode === "dish") {
      const q = query.trim();
      if (!q) return inputRef.current?.focus();
      if (looksLikeUrl(q)) router.push(`/import?url=${encodeURIComponent(toUrl(q))}`);
      else router.push(`/search?q=${encodeURIComponent(q)}`);
      return;
    }
    const extra = parsePantryInput(draft);
    const items = [...new Set([...pantry, ...extra])];
    if (extra.length) add(extra);
    setDraft("");
    if (!items.length) return inputRef.current?.focus();
    router.push(`/search?have=${encodeURIComponent(items.join(","))}`);
  }

  function onDraftKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if ((event.key === "," || event.key === "Enter") && draft.trim()) {
      event.preventDefault();
      add(parsePantryInput(draft));
      setDraft("");
    } else if (event.key === "Backspace" && !draft && pantry.length) {
      remove(pantry[pantry.length - 1]!);
    }
  }

  const tabs = [
    { value: "dish" as const, label: "Search recipes" },
    { value: "have" as const, label: "Use what I have" },
  ];

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Find a recipe"
      className={`w-full ${hero ? "rounded-2xl border border-line bg-surface p-3 shadow-lg shadow-black/5 sm:p-4" : ""}`}
    >
      <div role="group" aria-label="Search by" className="mb-3 flex gap-1 rounded-full bg-surface-3 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            aria-pressed={mode === tab.value}
            onClick={() => {
              setMode(tab.value);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="flex-1 rounded-full px-4 py-2 text-[0.95rem] font-bold text-muted transition-colors hover:text-ink aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-sm"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "dish" ? (
        <>
          <div className="flex gap-2">
            <label htmlFor={`${id}-q`} className="sr-only">
              Dish, ingredient or recipe link
            </label>
            <input
              ref={inputRef}
              id={`${id}-q`}
              name="q"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try biryani or chicken"
              className={`field ${hero ? "min-h-13 text-lg" : ""}`}
              maxLength={2000}
            />
            <button type="submit" className={`btn btn-primary shrink-0 ${hero ? "min-h-13 px-6" : ""}`}>
              Search
            </button>
          </div>
          <p className="mt-2 text-sm text-muted">
            Type a dish or an ingredient. You can also paste a link from any recipe website.
          </p>
          {showPopular ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-muted">Popular:</span>
              {POPULAR.map((p) => (
                <Link
                  key={p}
                  href={`/search?q=${encodeURIComponent(p)}`}
                  className="rounded-full border border-line px-3 py-1 text-sm font-semibold hover:border-brand hover:text-brand"
                >
                  {p}
                </Link>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div
            className={`field flex flex-wrap items-center gap-2 py-2 ${hero ? "min-h-13 text-lg" : ""}`}
            onClick={() => inputRef.current?.focus()}
          >
            {pantry.length ? (
              <ul className="contents" aria-label="Your ingredients">
                {pantry.map((item) => (
                  <li key={item} className="chip chip-have">
                    {item}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(item);
                      }}
                      className="-mr-1 grid size-5 place-items-center rounded-full hover:bg-black/15"
                      aria-label={`Remove ${item}`}
                    >
                      <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden="true">
                        <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <label htmlFor={`${id}-have`} className="sr-only">
              Add an ingredient you have
            </label>
            <input
              ref={inputRef}
              id={`${id}-have`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onDraftKey}
              enterKeyHint="done"
              autoComplete="off"
              placeholder={pantry.length ? "Add another ingredient" : "e.g. chicken, then press Enter"}
              className="min-w-[10rem] flex-1 bg-transparent outline-none placeholder:text-muted"
              maxLength={120}
            />
          </div>
          <p className="mt-2 text-sm text-muted">
            Add the ingredients in your kitchen, one at a time. We&apos;ll show recipes that use them.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button type="submit" className="btn btn-primary">
              Find recipes
            </button>
            {pantry.length ? (
              <button
                type="button"
                onClick={clear}
                className="text-sm font-semibold text-muted underline hover:text-ink"
              >
                Clear list
              </button>
            ) : null}
          </div>
        </>
      )}
    </form>
  );
}
