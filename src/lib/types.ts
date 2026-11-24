/** Where a recipe came from. The kitchen helper uses this to load the recipe again on the server. */
export type RecipeSource =
  | { kind: "mealdb"; id: string }
  | { kind: "bitebox"; id: string }
  | { kind: "web"; url: string; site: string }
  | { kind: "ai"; prompt: string };

export interface Ingredient {
  /** Amount as written, e.g. "1/2 cup" or "2 cloves". May be empty. */
  measure: string;
  /** What it is, e.g. "brown sugar". */
  name: string;
}

export interface Recipe {
  source: RecipeSource;
  title: string;
  summary?: string;
  image?: string;
  /** Country or cuisine, e.g. "Italy". */
  cuisine?: string;
  category?: string;
  tags: string[];
  ingredients: Ingredient[];
  steps: string[];
  servings?: string;
  totalTime?: string;
  video?: string;
  /** The original page, when there is one. */
  sourceUrl?: string;
  author?: string;
  tips?: string[];
  /** Whole minutes, when known (used for structured data). */
  totalMinutes?: number;
  /** Credit for photos that need it (Unsplash). */
  photoCredit?: { name: string; url: string };
}

/** A recipe in a list (search results, cuisine pages). */
export interface RecipeSummary {
  id: string;
  slug: string;
  title: string;
  image: string;
  cuisine?: string;
  category?: string;
}

export interface Cuisine {
  name: string;
  slug: string;
  count: number;
}

export interface Category {
  name: string;
  slug: string;
  count: number;
  image?: string;
}
