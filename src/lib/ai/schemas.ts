import { z } from "zod";

const shortText = (max: number) => z.string().trim().min(1).max(max);

export const ingredientInput = z.object({
  measure: z.string().trim().max(60),
  name: shortText(100),
});

/** A recipe sent from the browser (only for AI-made recipes, which live only in the browser). */
export const recipeInput = z.object({
  title: shortText(120),
  summary: z.string().trim().max(400).optional(),
  servings: z.string().trim().max(60).optional(),
  ingredients: z.array(ingredientInput).min(1).max(40),
  steps: z.array(shortText(600)).min(1).max(30),
});

export const recipeRef = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mealdb"), id: z.string().regex(/^\d{1,9}$/) }),
  z.object({ kind: z.literal("bitebox"), id: z.string().regex(/^pk-[a-z0-9-]{2,60}$/) }),
  z.object({ kind: z.literal("web"), url: z.string().url().max(2000) }),
  z.object({ kind: z.literal("ai"), recipe: recipeInput }),
]);
export type RecipeRef = z.infer<typeof recipeRef>;

export const QUICK_ASKS = {
  spicier: "Make it spicier. Tell me what to add, how much, and at which step.",
  creamier: "Make it creamier. Tell me what to add or change, how much, and at which step.",
  "no-oil": "How do I cook this without oil? Keep it from sticking or drying out.",
  "no-salt": "How do I make this without salt and still keep it tasty?",
  vegetarian: "Make this vegetarian. What should I swap and how do the steps change?",
  lighter: "Make this lighter and healthier without losing the main flavour.",
  faster: "How can I make this faster on a weeknight?",
  serve: "What should I serve with this?",
} as const;
export type QuickAsk = keyof typeof QUICK_ASKS;

export const askRequest = z.object({
  recipe: recipeRef,
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: shortText(1200) }))
    .min(1)
    .max(12)
    .refine((m) => m[m.length - 1]?.role === "user", "The last message must be from the cook.")
    .refine(
      (m) => m.filter((x) => x.role === "user").every((x) => x.content.length <= 500),
      "Questions are limited to 500 characters.",
    ),
});

export const substituteRequest = z.object({
  recipe: recipeRef,
  ingredient: ingredientInput,
});

export const substituteResult = z.object({
  options: z
    .array(
      z.object({
        swap: z.string().describe("What to use instead, e.g. 'Milk + lemon juice'"),
        amount: z.string().describe("How much to use for this recipe's amount, e.g. '1 cup milk + 1 tbsp lemon juice'"),
        how: z.string().describe("How to use it in this recipe, one or two sentences"),
        effect: z.string().describe("How the taste or texture changes, one short sentence"),
        fit: z.enum(["best", "good", "in a pinch"]).describe("How well it works in this dish"),
      }),
    )
    .min(1)
    .max(4),
  skip: z.string().optional().describe("What happens if the cook leaves it out, if that's an option"),
  note: z.string().optional().describe("Allergy or food-safety note, only when relevant"),
});
export type SubstituteResult = z.infer<typeof substituteResult>;

export const recipeRequest = z.object({
  prompt: shortText(140),
  have: z.array(shortText(40)).max(12).optional(),
});

export const generatedRecipe = z.object({
  title: z.string().describe("Dish name"),
  summary: z.string().describe("One or two sentences about the dish"),
  cuisine: z.string().optional().describe("Country or cuisine, if any"),
  servings: z.string().describe("e.g. '4 servings'"),
  totalTime: z.string().describe("e.g. '45 min'"),
  ingredients: z
    .array(z.object({ measure: z.string().describe("Amount, e.g. '2 tbsp'"), name: z.string().describe("Ingredient") }))
    .min(2)
    .max(30),
  steps: z.array(z.string()).min(2).max(16).describe("Method, one action per step, no numbering"),
  tips: z.array(z.string()).max(4).describe("Short practical tips"),
});
export type GeneratedRecipe = z.infer<typeof generatedRecipe>;
