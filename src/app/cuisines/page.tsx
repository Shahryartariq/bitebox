import type { Metadata } from "next";
import Link from "next/link";
import { getCuisines } from "@/lib/mealdb";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Recipes by cuisine",
  description: "Browse recipes from dozens of countries, from Indian curries to Italian pasta and Japanese teriyaki.",
  alternates: { canonical: "/cuisines" },
};

export default async function CuisinesPage() {
  const cuisines = await getCuisines();
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Recipes by cuisine</h1>
      <p className="mt-3 max-w-prose text-muted">{cuisines.length} cuisines, sorted by how many recipes each has.</p>
      <ul className="mt-10 columns-2 gap-x-8 sm:columns-3 lg:columns-4">
        {cuisines.map((c) => (
          <li key={c.slug} className="break-inside-avoid border-b border-line">
            <Link
              href={`/cuisine/${c.slug}`}
              className="flex items-baseline justify-between gap-3 py-2.5 hover:text-brand"
            >
              <span className="font-semibold">{c.name}</span>
              <span className="text-sm text-muted">{c.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
