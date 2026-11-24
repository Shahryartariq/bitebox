import { normalize, singular } from "./text";
import type { Ingredient } from "./types";

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 1 / 2,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
};
const FRACTION_CHARS = Object.keys(UNICODE_FRACTIONS).join("");

// One number: "1/2", "1", "1.5", "1,5", "½", "1½", "1 1/2", "1 ½" (plain fractions first so "3/4" isn't read as 3).
const NUMBER = `(?:\\d+\\/\\d+|\\d+(?:[.,]\\d+)?(?:\\s*[${FRACTION_CHARS}]|\\s+\\d+\\/\\d+)?|[${FRACTION_CHARS}])`;
// A quantity: one number, a mixed number written with a dash ("2-1/2", "1-⅓"), or a range ("2-3", "2 to 3").
const QUANTITY = new RegExp(`^\\s*(${NUMBER})(?:\\s*(?:-|–|to)\\s*(${NUMBER}))?`, "i");

export function parseNumber(raw: string): number | undefined {
  const s = raw.trim().replace(",", ".");
  const plain = /^(\d+)\/(\d+)$/.exec(s);
  if (plain) return Number(plain[2]) ? Number(plain[1]) / Number(plain[2]) : undefined;
  let total = 0;
  let matched = false;
  const mixed = /^(\d+(?:\.\d+)?)\s*(.*)$/.exec(s);
  let rest = s;
  if (mixed) {
    total += Number(mixed[1]);
    rest = (mixed[2] ?? "").trim();
    matched = true;
  }
  if (rest) {
    const frac = /^(\d+)\/(\d+)$/.exec(rest);
    if (frac) {
      const d = Number(frac[2]);
      if (!d) return undefined;
      total += Number(frac[1]) / d;
      matched = true;
    } else if (rest.length === 1 && UNICODE_FRACTIONS[rest] !== undefined) {
      total += UNICODE_FRACTIONS[rest] ?? 0;
      matched = true;
    } else {
      return undefined;
    }
  }
  return matched ? total : undefined;
}

function isFractionOnly(raw: string): boolean {
  return /^\d+\/\d+$/.test(raw.trim()) || (raw.trim().length === 1 && FRACTION_CHARS.includes(raw.trim()));
}

export interface ParsedQuantity {
  low: number;
  high?: number;
  /** Text after the quantity. */
  rest: string;
}

export function parseQuantity(measure: string): ParsedQuantity | undefined {
  const m = QUANTITY.exec(measure);
  if (!m || !m[1]) return undefined;
  const first = parseNumber(m[1]);
  if (first === undefined) return undefined;
  const rest = measure.slice(m[0].length);
  if (m[2]) {
    const second = parseNumber(m[2]);
    if (second === undefined) return { low: first, rest: measure.slice(m[1].length + (m.index ?? 0)) };
    // "2-1/2 cups" and "1-⅓ cups" are mixed numbers, not ranges.
    if (isFractionOnly(m[2]) && Number.isInteger(first) && second < 1) {
      return { low: first + second, rest };
    }
    return { low: first, high: second, rest };
  }
  return { low: first, rest };
}

const NICE_FRACTIONS: Array<[number, string]> = [
  [1 / 8, "⅛"],
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [3 / 8, "⅜"],
  [1 / 2, "½"],
  [5 / 8, "⅝"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
  [7 / 8, "⅞"],
];

export function formatNumber(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n >= 20) return String(Math.round(n));
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 1 / 16) return String(whole || "⅛");
  if (frac > 15 / 16) return String(whole + 1);
  let best = NICE_FRACTIONS[0]!;
  for (const candidate of NICE_FRACTIONS) {
    if (Math.abs(candidate[0] - frac) < Math.abs(best[0] - frac)) best = candidate;
  }
  return whole ? `${whole}${best[1]}` : best[1];
}

/**
 * Scale the amount in a measure. Only the leading quantity is scaled (and a second
 * weight after a slash, as in "175g/6oz"); package sizes like "1 (400g) tin" keep their size.
 */
export function scaleMeasure(measure: string, factor: number): string {
  if (factor === 1 || !measure.trim()) return measure;
  const parsed = parseQuantity(measure);
  if (!parsed) return measure;
  const low = formatNumber(parsed.low * factor);
  const high = parsed.high !== undefined ? `–${formatNumber(parsed.high * factor)}` : "";
  let rest = parsed.rest;
  const dual = /^(\s*[a-z]+\s*\/\s*)(\d+(?:\.\d+)?)/i.exec(rest);
  if (dual && dual[2]) {
    rest = `${dual[1]}${formatNumber(Number(dual[2]) * factor)}${rest.slice(dual[0].length)}`;
  }
  return `${low}${high}${rest}`;
}

const UNIT_WORDS = [
  "cups?",
  "c\\.",
  "tablespoons?",
  "tbsps?\\.?",
  "tbs\\.?",
  "tblsp",
  "tsps?\\.?",
  "teaspoons?",
  "grams?",
  "g",
  "kg",
  "kilograms?",
  "mg",
  "ml",
  "millilitres?",
  "milliliters?",
  "l",
  "litres?",
  "liters?",
  "oz\\.?",
  "ounces?",
  "fl\\.? oz",
  "lbs?\\.?",
  "pounds?",
  "pints?",
  "quarts?",
  "cloves?",
  "pinch(?:es)?",
  "dash(?:es)?",
  "cans?",
  "tins?",
  "jars?",
  "packets?",
  "packs?",
  "sticks?",
  "slices?",
  "handfuls?",
  "bunch(?:es)?",
  "sprigs?",
  "pieces?",
  "heads?",
  "stalks?",
  "sheets?",
  "drops?",
  "knobs?",
  "pkg\\.?",
];
const UNIT = new RegExp(`^\\s*(?:\\([^)]*\\)\\s*)?(?:${UNIT_WORDS.join("|")})(?![a-z])\\.?`, "i");

/** Split "2 cups plain flour, sifted" into { measure: "2 cups", name: "plain flour, sifted" }. */
export function parseIngredientLine(line: string): Ingredient {
  const text = line.replace(/\s+/g, " ").trim();
  const q = QUANTITY.exec(text);
  if (!q || q[0].trim() === "") {
    // Lines like "Pinch of salt" or "Salt and pepper, to taste".
    const lead = /^(a\s+)?(pinch|dash|handful|knob|splash|few)\s+(of\s+)?/i.exec(text);
    if (lead) return { measure: lead[0].replace(/\s+of\s*$/i, "").trim(), name: text.slice(lead[0].length) };
    return { measure: "", name: text };
  }
  let measure = q[0];
  let rest = text.slice(q[0].length);
  const unit = UNIT.exec(rest);
  if (unit) {
    measure += unit[0];
    rest = rest.slice(unit[0].length);
  }
  rest = rest.replace(/^\s*of\s+/i, "").trim();
  return { measure: measure.trim(), name: rest || measure.trim() };
}

/** Turn a block of instructions into steps. */
export function splitSteps(instructions: string): string[] {
  const lines = instructions
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/­/g, "-").trim())
    .filter(Boolean);

  const merged: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/^(?:step\s*\d+\s*[:.)-]?|\d+\s*[.)]|[•▪●*-])\s*/i, "").trim();
    if (!line) continue; // a bare "STEP 1" heading
    const prev = merged[merged.length - 1];
    // Hard-wrapped lines: previous line ends mid-sentence and this one carries on in lowercase.
    if (prev && !/[.!?:)]$/.test(prev) && /^[a-z(]/.test(line)) {
      merged[merged.length - 1] = `${prev} ${line}`;
    } else {
      merged.push(line);
    }
  }

  // One big paragraph: split it into steps of about two sentences.
  if (merged.length === 1 && merged[0]!.length > 320) {
    const sentences = merged[0]!.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)?.map((s) => s.trim()) ?? [];
    const steps: string[] = [];
    let current = "";
    for (const sentence of sentences) {
      current = current ? `${current} ${sentence}` : sentence;
      if (current.length > 140) {
        steps.push(current);
        current = "";
      }
    }
    if (current) steps.push(current);
    return steps;
  }
  return merged;
}

const SYNONYMS: Record<string, string> = {
  chilli: "chili",
  chile: "chili",
  chillies: "chili",
  chilies: "chili",
  yoghurt: "yogurt",
  eggplant: "aubergine",
  brinjal: "aubergine",
  baingan: "aubergine",
  cilantro: "coriander",
  zucchini: "courgette",
  shrimp: "prawn",
  scallion: "spring onion",
  capsicum: "pepper",
  garbanzo: "chickpea",
  mince: "minced",
  ground: "minced",
  aloo: "potato",
  gobi: "cauliflower",
  murgh: "chicken",
  dahi: "yogurt",
  pyaz: "onion",
  lehsan: "garlic",
};

/** Words that describe an ingredient but don't change what it is. */
const DESCRIPTORS = new Set([
  "fresh",
  "freshly",
  "chopped",
  "sliced",
  "diced",
  "minced",
  "large",
  "small",
  "medium",
  "whole",
  "raw",
  "cooked",
  "dried",
  "ground",
  "finely",
  "roughly",
  "grated",
  "peeled",
  "boneless",
  "skinless",
  "extra",
  "virgin",
  "free",
  "range",
  "organic",
  "plain",
  "beaten",
  "cubed",
  "shredded",
  "frozen",
  "tinned",
  "canned",
  "baby",
  "lean",
  "hot",
  "cold",
  "warm",
  "thinly",
  "crushed",
  "toasted",
  "unsalted",
  "salted",
  "of",
]);

export function ingredientWords(name: string): string[] {
  return normalize(name.replace(/\([^)]*\)/g, " "))
    .split(" ")
    .filter(Boolean)
    .map((w) => SYNONYMS[w] ?? w)
    .flatMap((w) => w.split(" "))
    .map(singular);
}

/** Does a pantry item ("chicken") cover a recipe ingredient ("chicken breasts")? */
export function pantryCovers(pantryItem: string, ingredientName: string): boolean {
  const want = ingredientWords(pantryItem).filter((w) => !DESCRIPTORS.has(w));
  if (!want.length) return false;
  const have = new Set(ingredientWords(ingredientName));
  return want.every((w) => have.has(w));
}

/** Ingredients nobody needs to shop for. */
export function isFreeIngredient(name: string): boolean {
  const words = ingredientWords(name).filter((w) => !DESCRIPTORS.has(w));
  return words.length > 0 && words.every((w) => w === "water" || w === "ice" || w === "boiling");
}

export interface PantryCoverage {
  have: string[];
  missing: string[];
}

export function coverage(ingredients: Ingredient[], pantry: string[]): PantryCoverage {
  const have: string[] = [];
  const missing: string[] = [];
  for (const ingredient of ingredients) {
    if (isFreeIngredient(ingredient.name)) continue;
    if (pantry.some((p) => pantryCovers(p, ingredient.name))) have.push(ingredient.name);
    else missing.push(ingredient.name);
  }
  return { have, missing };
}
