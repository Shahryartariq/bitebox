import { describe, expect, it } from "vitest";
import {
  coverage,
  formatNumber,
  isFreeIngredient,
  pantryCovers,
  parseIngredientLine,
  parseQuantity,
  scaleMeasure,
  splitSteps,
} from "@/lib/ingredients";

describe("parseQuantity", () => {
  it.each([
    ["1", 1],
    ["1.5 tablespoon", 1.5],
    ["1/2 teaspoon", 0.5],
    ["1 1/4 cup", 1.25],
    ["½ cup", 0.5],
    ["1½ kg", 1.5],
    ["2-1/2 cups", 2.5],
    ["1-⅓ cups", 4 / 3],
    ["200 g", 200],
    ["500g", 500],
  ])("reads %s", (input, value) => {
    expect(parseQuantity(input)?.low).toBeCloseTo(value);
  });

  it("reads ranges", () => {
    expect(parseQuantity("2-3 tbsp")).toMatchObject({ low: 2, high: 3, rest: " tbsp" });
    expect(parseQuantity("1-2tbsp")).toMatchObject({ low: 1, high: 2 });
  });

  it("returns undefined for words", () => {
    expect(parseQuantity("pinch")).toBeUndefined();
    expect(parseQuantity("To taste")).toBeUndefined();
    expect(parseQuantity("Topping")).toBeUndefined();
  });
});

describe("formatNumber", () => {
  it("uses kitchen fractions", () => {
    expect(formatNumber(0.5)).toBe("½");
    expect(formatNumber(1.25)).toBe("1¼");
    expect(formatNumber(0.333)).toBe("⅓");
    expect(formatNumber(1.5)).toBe("1½");
    expect(formatNumber(3)).toBe("3");
    expect(formatNumber(400)).toBe("400");
    expect(formatNumber(0.02)).toBe("⅛");
  });
});

describe("scaleMeasure", () => {
  it("leaves the measure alone at 1×", () => {
    expect(scaleMeasure("3/4 cup", 1)).toBe("3/4 cup");
  });
  it("scales the leading amount", () => {
    expect(scaleMeasure("3/4 cup", 2)).toBe("1½ cup");
    expect(scaleMeasure("500g", 0.5)).toBe("250g");
    expect(scaleMeasure("1 lb", 3)).toBe("3 lb");
    expect(scaleMeasure("2 cloves", 0.5)).toBe("1 cloves");
  });
  it("scales both sides of a metric/imperial pair", () => {
    expect(scaleMeasure("175g/6oz", 2)).toBe("350g/12oz");
  });
  it("keeps package sizes", () => {
    expect(scaleMeasure("1 (400g) tin", 2)).toBe("2 (400g) tin");
  });
  it("scales ranges", () => {
    expect(scaleMeasure("2-3 tbsp", 2)).toBe("4–6 tbsp");
  });
  it("leaves words untouched", () => {
    expect(scaleMeasure("pinch", 2)).toBe("pinch");
    expect(scaleMeasure("To taste", 3)).toBe("To taste");
  });
});

describe("parseIngredientLine", () => {
  it.each([
    ["2 cups plain flour, sifted", "2 cups", "plain flour, sifted"],
    ["1 (14 oz) can chopped tomatoes", "1 (14 oz) can", "chopped tomatoes"],
    ["½ tsp ground cumin", "½ tsp", "ground cumin"],
    ["3 large eggs", "3", "large eggs"],
    ["200g of butter", "200g", "butter"],
    ["Pinch of salt", "Pinch", "salt"],
    ["Salt and pepper, to taste", "", "Salt and pepper, to taste"],
    ["1 1/2 tablespoons olive oil", "1 1/2 tablespoons", "olive oil"],
  ])("splits %s", (line, measure, name) => {
    expect(parseIngredientLine(line)).toEqual({ measure, name });
  });
});

describe("splitSteps", () => {
  it("splits on line breaks and drops empty lines", () => {
    expect(splitSteps("Mix it.\r\n\r\nBake it.\r\nServe.")).toEqual(["Mix it.", "Bake it.", "Serve."]);
  });

  it("removes step labels and numbering", () => {
    expect(splitSteps("STEP 1\r\nChop the onion.\r\nSTEP 2\r\nFry it.\r\n3. Serve.")).toEqual([
      "Chop the onion.",
      "Fry it.",
      "Serve.",
    ]);
  });

  it("joins hard-wrapped lines", () => {
    const text =
      "Rinse the baingan in water. Apply some oil all over and\r\nkeep it for roasting on an open flame.\r\n2. Roast it.";
    expect(splitSteps(text)).toEqual([
      "Rinse the baingan in water. Apply some oil all over and keep it for roasting on an open flame.",
      "Roast it.",
    ]);
  });

  it("splits one long paragraph into a few steps", () => {
    const paragraph = Array.from(
      { length: 8 },
      (_, i) => `This is sentence number ${i + 1} of the method, with detail.`,
    ).join(" ");
    const steps = splitSteps(paragraph);
    expect(steps.length).toBeGreaterThan(2);
    expect(steps.join(" ")).toBe(paragraph);
  });
});

describe("pantry matching", () => {
  it("matches a general item to a specific ingredient", () => {
    expect(pantryCovers("chicken", "chicken breasts")).toBe(true);
    expect(pantryCovers("tomato", "Chopped tomatoes")).toBe(true);
    expect(pantryCovers("eggplant", "Aubergine")).toBe(true);
    expect(pantryCovers("cilantro", "Coriander Leaves")).toBe(true);
  });
  it("doesn't match different things", () => {
    expect(pantryCovers("chicken stock", "chicken breasts")).toBe(false);
    expect(pantryCovers("rice", "rice stick noodles")).toBe(true);
    expect(pantryCovers("garlic", "ginger")).toBe(false);
    expect(pantryCovers("fresh", "fresh basil")).toBe(false);
  });
  it("treats water as free", () => {
    expect(isFreeIngredient("Water")).toBe(true);
    expect(isFreeIngredient("cold water")).toBe(true);
    expect(isFreeIngredient("rose water syrup")).toBe(false);
  });
  it("counts what you have and what's missing", () => {
    const result = coverage(
      [
        { measure: "2", name: "chicken breasts" },
        { measure: "1/2 cup", name: "water" },
        { measure: "3 cups", name: "brown rice" },
        { measure: "1 tsp", name: "ground ginger" },
      ],
      ["chicken", "rice"],
    );
    expect(result).toEqual({ have: ["chicken breasts", "brown rice"], missing: ["ground ginger"] });
  });
});
