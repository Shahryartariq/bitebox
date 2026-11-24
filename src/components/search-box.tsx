"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { usePantry } from "@/lib/client/storage";
import { parsePantryInput } from "@/lib/search";
import { looksLikeUrl, toUrl } from "@/lib/text";

type Mode = "dish" | "have";

export function SearchBox({
  initialMode = "dish",
  initialQuery = "",
  size = "hero",
}: {
  initialMode?: Mode;
  initialQuery?: string;
  size?: "hero" | "compact";
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

  return (
    <form onSubmit={submit} role="search" aria-label="Find a recipe" className="w-full">
      <div role="group" aria-label="Search by" className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["dish", "Dish, ingredient or link"],
            ["have", "What I have"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            className="rounded-full border-2 border-line px-4 py-1.5 text-sm font-semibold text-muted transition-colors hover:border-ink hover:text-ink aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-bg"
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "dish" ? (
        <div className={`flex gap-2 ${hero ? "flex-col sm:flex-row" : "flex-row"}`}>
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
            placeholder="Biryani, chicken, or paste a recipe link"
            className={`field ${hero ? "min-h-14 text-lg" : ""}`}
            maxLength={2000}
          />
          <button type="submit" className={`btn btn-primary shrink-0 ${hero ? "min-h-14 px-7 text-lg" : ""}`}>
            Search
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div
            className={`field flex min-h-14 flex-wrap items-center gap-2 py-2 ${hero ? "text-lg" : ""}`}
            onClick={() => inputRef.current?.focus()}
          >
            {pantry.length ? (
              <ul className="contents" aria-label="Your ingredients">
                {pantry.map((item) => (
                  <li key={item} className="tape">
                    {item}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(item);
                      }}
                      className="-mr-1 grid size-5 place-items-center rounded-full hover:bg-black/10"
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
              placeholder={pantry.length ? "Add another" : "Type an ingredient and press Enter"}
              className="min-w-[10rem] flex-1 bg-transparent outline-none placeholder:text-muted"
              maxLength={120}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" className={`btn btn-primary ${hero ? "min-h-14 px-7 text-lg" : ""}`}>
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
            ) : (
              <p className="text-sm text-muted">Your list stays in this browser for next time.</p>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
