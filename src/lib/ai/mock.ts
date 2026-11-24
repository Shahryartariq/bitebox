import type { GeneratedRecipe, SubstituteResult } from "./schemas";

/** Canned answers for tests and for local development without a Gemini key. */
export function mockAnswer(question: string, title: string): string {
  const q = question.toLowerCase();
  if (q.includes("spic")) {
    return `For a spicier ${title}:\n- Add **1 tsp chilli flakes** with the garlic so the heat blooms in the oil.\n- Stir in **1 chopped green chilli** in the last 5 minutes for a fresh kick.\n\nTaste before serving and add more a pinch at a time.`;
  }
  if (q.includes("oil")) {
    return `You can cook ${title} without oil:\n- Sweat the onions in **2–3 tbsp water or stock** instead of oil, adding a splash more when the pan dries.\n- Use a non-stick pan and medium heat so nothing catches.`;
  }
  return `Here's a tip for ${title}: read the method through once before you start, and get every ingredient measured out first. (This is a sample answer — add a Gemini key for real ones.)`;
}

export function mockSubstitute(ingredient: string): SubstituteResult {
  return {
    options: [
      {
        swap: `Sample swap for ${ingredient}`,
        amount: "Same amount",
        how: "Use it exactly where the recipe uses the original.",
        effect: "Slightly different flavour.",
        fit: "good",
      },
      {
        swap: "Leave it out",
        amount: "—",
        how: "Skip it and taste before serving.",
        effect: "A little less depth.",
        fit: "in a pinch",
      },
    ],
    note: "Sample answer — add a Gemini key for real swaps.",
  };
}

export function mockRecipe(prompt: string, have?: string[]): GeneratedRecipe {
  const main = have?.[0] ?? "vegetables";
  return {
    title: `Quick ${prompt}`.slice(0, 80),
    summary: `A sample recipe for "${prompt}". Add a Gemini key to get real AI recipes.`,
    cuisine: undefined,
    servings: "2 servings",
    totalTime: "25 min",
    ingredients: [
      { measure: "1 tbsp", name: "olive oil" },
      { measure: "1", name: "onion, sliced" },
      { measure: "300g", name: main },
      { measure: "1 pinch", name: "salt" },
    ],
    steps: [
      "Heat the oil in a pan over medium heat.",
      "Add the onion and cook for 5 minutes until soft.",
      `Add the ${main} and cook until done, about 10 minutes.`,
      "Season with salt and serve.",
    ],
    tips: ["Taste and adjust the seasoning before serving."],
  };
}
