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
  const place = [recipe.cuisine, recipe.category].filter(Boolean).join(", ");
  return (
    <li className="group relative">
      <div className="aspect-[4/3] overflow-hidden rounded-[10px] bg-surface-2">
        {image ? (
          <img
            src={image}
            alt=""
            width={500}
            height={375}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>
      <h3 className="mt-3 text-xl font-bold [font-stretch:84%]">
        <Link href={`/recipe/${recipe.slug}`} className="after:absolute after:inset-0 hover:underline">
          {recipe.title}
        </Link>
      </h3>
      {place ? <p className="mt-1 text-sm text-muted">{place}</p> : null}
      {have && missing ? (
        <p className="mt-2 text-sm">
          <span className="font-semibold text-basil">
            Uses {have.length} {have.length === 1 ? "thing" : "things"} you have
          </span>
          {missing.length ? (
            <span className="text-muted">
              . Needs {missing.length} more: {missing.slice(0, 3).join(", ").toLowerCase()}
              {missing.length > 3 ? ", …" : ""}
            </span>
          ) : (
            <span className="text-muted">. Nothing else to buy.</span>
          )}
        </p>
      ) : null}
    </li>
  );
}

export function RecipeGrid({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </ul>
  );
}
