"use client";

import Link from "next/link";
import { useSaved } from "@/lib/client/storage";
import { useHydrated } from "@/lib/client/use-hydrated";
import { sizedImage } from "@/lib/mealdb-map";

export function SavedList() {
  const { saved, remove } = useSaved();
  const mounted = useHydrated();

  if (!mounted) return <div className="mt-10 h-40" aria-hidden="true" />;

  if (!saved.length) {
    return (
      <div className="mt-10 max-w-xl rounded-[18px] border-2 border-dashed border-line p-8">
        <h2 className="text-3xl font-extrabold">Nothing saved yet</h2>
        <p className="mt-2 text-muted">Tap Save on any recipe to keep it here for later.</p>
        <Link href="/search" className="btn btn-primary mt-5">
          Find a recipe
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3" aria-label="Saved recipes">
      {saved.map((item) => {
        const image = sizedImage(item.image, "medium");
        const kind = item.key.startsWith("ai:")
          ? "Written by AI"
          : item.key.startsWith("web:")
            ? "Imported"
            : undefined;
        return (
          <li key={item.key} className="flex gap-4">
            <div className="size-24 shrink-0 overflow-hidden rounded-2xl bg-surface-2">
              {image ? (
                <img
                  src={image}
                  alt=""
                  width={96}
                  height={96}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="size-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg">
                <Link href={item.href} className="hover:underline">
                  {item.title}
                </Link>
              </h2>
              {kind ? <p className="text-sm text-muted">{kind}</p> : null}
              <button
                type="button"
                onClick={() => remove(item.key)}
                className="mt-1 text-sm font-semibold text-muted underline hover:text-brand"
              >
                Remove
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
