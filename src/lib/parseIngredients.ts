/**
 * Parses a block of plain-text ingredient lines into structured objects.
 * Handles common formats:
 *   "2 cups all-purpose flour, sifted"
 *   "1 1/2 tsp baking soda"
 *   "a handful of fresh basil"
 *   "salt and pepper to taste"
 */

const UNITS = new Set([
  "cup", "cups", "c",
  "tablespoon", "tablespoons", "tbsp", "tbs",
  "teaspoon", "teaspoons", "tsp",
  "pound", "pounds", "lb", "lbs",
  "ounce", "ounces", "oz",
  "gram", "grams", "g",
  "kilogram", "kilograms", "kg",
  "milliliter", "milliliters", "ml",
  "liter", "liters", "l",
  "pinch", "pinches",
  "dash", "dashes",
  "handful", "handfuls",
  "clove", "cloves",
  "slice", "slices",
  "piece", "pieces",
  "can", "cans",
  "package", "packages", "pkg",
  "bunch", "bunches",
  "sprig", "sprigs",
  "stalk", "stalks",
  "head", "heads",
  "sheet", "sheets",
]);

const FRACTION_MAP: Record<string, string> = {
  "½": "1/2", "⅓": "1/3", "⅔": "2/3",
  "¼": "1/4", "¾": "3/4", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
};

function normalizeFractions(str: string): string {
  return str.replace(/[½⅓⅔¼¾⅛⅜⅝⅞]/g, (c) => FRACTION_MAP[c] ?? c);
}

export type ParsedIngredient = {
  qty: string;
  unit: string;
  name: string;
  notes: string;
};

export function parseIngredientLine(line: string): ParsedIngredient {
  line = normalizeFractions(line.trim());

  // Extract notes after a comma
  let notes = "";
  const commaIdx = line.indexOf(",");
  if (commaIdx !== -1) {
    notes = line.slice(commaIdx + 1).trim();
    line = line.slice(0, commaIdx).trim();
  }

  const tokens = line.split(/\s+/);
  let pos = 0;

  // Parse quantity: may be "1", "1/2", or "1 1/2"
  let qty = "";
  const qtyRegex = /^\d+([./]\d+)?$/;

  if (pos < tokens.length && qtyRegex.test(tokens[pos])) {
    qty = tokens[pos];
    pos++;
    // Check for mixed number like "1 1/2"
    if (pos < tokens.length && /^\d+\/\d+$/.test(tokens[pos])) {
      qty = `${qty} ${tokens[pos]}`;
      pos++;
    }
  } else if (pos < tokens.length && /^(a|an)$/i.test(tokens[pos])) {
    qty = tokens[pos];
    pos++;
  }

  // Parse unit
  let unit = "";
  if (pos < tokens.length && UNITS.has(tokens[pos].toLowerCase().replace(/\.$/, ""))) {
    unit = tokens[pos];
    pos++;
  }

  const name = tokens.slice(pos).join(" ");

  return { qty, unit, name: name || line, notes };
}

export function parseIngredientsText(text: string): ParsedIngredient[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map(parseIngredientLine);
}

export function parseStepsText(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    // Remove leading numbers/bullets: "1.", "1)", "•", "-"
    .map((l) => l.replace(/^(\d+[.)]\s*|[-•*]\s*)/, ""))
    .filter((l) => l.length > 0);
}
