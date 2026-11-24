"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Recipe } from "../types";

/** Browser storage can be missing or throw (private mode, blocked cookies). Never let that break the page. */
function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked */
  }
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

const cache = new Map<string, { raw: string | null; value: unknown }>();

function snapshot<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = null;
  }
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value as T;
  const value = raw ? (read<T>(key, fallback) ?? fallback) : fallback;
  cache.set(key, { raw, value });
  return value;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function useStored<T>(key: string, fallback: T): [T, (next: T) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => snapshot(key, fallback),
    () => fallback,
  );
  const set = useCallback((next: T) => write(key, next), [key]);
  return [value, set];
}

export const SAVED_KEY = "bitebox:saved";
export const PANTRY_KEY = "bitebox:pantry";

export interface SavedRecipe {
  /** "mealdb:52772", "web:https://…" or "ai:<timestamp>" */
  key: string;
  title: string;
  image?: string;
  href: string;
  savedAt: number;
  /** AI recipes only exist in the browser, so the whole recipe is kept. */
  recipe?: Recipe;
}

const EMPTY_SAVED: SavedRecipe[] = [];
const EMPTY_PANTRY: string[] = [];

export function useSaved() {
  const [saved, setSaved] = useStored<SavedRecipe[]>(SAVED_KEY, EMPTY_SAVED);
  const list = Array.isArray(saved) ? saved : EMPTY_SAVED;
  const isSaved = useCallback((key: string) => list.some((s) => s.key === key), [list]);
  const toggle = useCallback(
    (item: Omit<SavedRecipe, "savedAt">) => {
      const current = read<SavedRecipe[]>(SAVED_KEY, []);
      const exists = current.some((s) => s.key === item.key);
      setSaved(
        exists
          ? current.filter((s) => s.key !== item.key)
          : [{ ...item, savedAt: Date.now() }, ...current].slice(0, 200),
      );
      return !exists;
    },
    [setSaved],
  );
  const remove = useCallback(
    (key: string) => setSaved(read<SavedRecipe[]>(SAVED_KEY, []).filter((s) => s.key !== key)),
    [setSaved],
  );
  return { saved: list, isSaved, toggle, remove };
}

export function usePantry() {
  const [pantry, setPantry] = useStored<string[]>(PANTRY_KEY, EMPTY_PANTRY);
  const list = Array.isArray(pantry) ? pantry : EMPTY_PANTRY;
  const add = useCallback(
    (items: string[]) => {
      const current = read<string[]>(PANTRY_KEY, []);
      const next = [...current];
      for (const item of items) {
        const clean = item.trim().toLowerCase().slice(0, 40);
        if (clean && !next.includes(clean)) next.push(clean);
      }
      setPantry(next.slice(0, 40));
    },
    [setPantry],
  );
  const remove = useCallback(
    (item: string) => setPantry(read<string[]>(PANTRY_KEY, []).filter((p) => p !== item)),
    [setPantry],
  );
  const clear = useCallback(() => setPantry([]), [setPantry]);
  return { pantry: list, add, remove, clear };
}

export function recipeKey(recipe: Recipe): string {
  if (recipe.source.kind === "mealdb") return `mealdb:${recipe.source.id}`;
  if (recipe.source.kind === "web") return `web:${recipe.source.url}`;
  return `ai:${recipe.title}`;
}
