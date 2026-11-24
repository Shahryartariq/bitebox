import Link from "next/link";
import { sizedImage } from "@/lib/mealdb-map";
import type { RecipeSummary } from "@/lib/types";

export function RecipeCard({
  recipe,
  have,
  missing,
  priority = false,
}: {
  recipe: RecipeSummary;
  have?: string[];
  missing?: string[];
  priority?: boolean;
}) {
  const image = sizedImage(recipe.image, "medium");
  return (
    <li className="group relative flex flex-col">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-surface-3">
        {image ? (
          <img
            src={image}
            alt=""
            width={700}
            height={525}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : null}
      </div>
      <h3 className="mt-3 text-lg leading-snug">
        <Link href={`/recipe/${recipe.slug}`} className="after:absolute after:inset-0 group-hover:text-brand">
          {recipe.title}
        </Link>
      </h3>
      <p className="mt-1 flex flex-wrap gap-x-3 text-sm text-muted">
        {recipe.cuisine ? <span>{recipe.cuisine}</span> : null}
        {recipe.category ? <span>{recipe.category}</span> : null}
      </p>
      {have && missing ? (
        <p className="mt-2 text-sm">
          <span className="font-semibold text-basil">
            You have {have.length} {have.length === 1 ? "ingredient" : "ingredients"}
          </span>
          {missing.length ? (
            <span className="text-muted">
              . Still need: {missing.slice(0, 3).join(", ").toLowerCase()}
              {missing.length > 3 ? ` and ${missing.length - 3} more` : ""}
            </span>
          ) : (
            <span className="text-muted">. Nothing else to buy.</span>
          )}
        </p>
      ) : null}
    </li>
  );
}

export function RecipeGrid({
  children,
  label,
  columns = 3,
}: {
  children: React.ReactNode;
  label?: string;
  columns?: 3 | 4;
}) {
  return (
    <ul
      aria-label={label}
      className={`grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 ${columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}
    >
      {children}
    </ul>
  );
}
