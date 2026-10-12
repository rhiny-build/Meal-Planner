/**
 * Ingredient amount parsing
 *
 * Turns the free-text `quantity` (and `unit`) of an Ingredient into a numeric
 * amount so cook mode can scale servings. Conservative on purpose: it only
 * returns an amount when the text is unambiguous, otherwise null (the free
 * text stays the fallback).
 *
 * Parsed:   "2", "1/2", "1 1/2", "1.5", "½", "1½", "500g", "1 1/2 pounds", "1/4 cup"
 * Not parsed (null): "2-3", "2 or 3", "2 + 1/2", "a pinch", "to taste", "1 can (400g)", "", "0"
 */

export interface ParsedAmount {
  amount: number | null
  /** Unit found inside the quantity text (e.g. "g" from "500g"), else the unit passed in, else null */
  unit: string | null
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4,
  '⅕': 1 / 5, '⅖': 2 / 5, '⅗': 3 / 5, '⅘': 4 / 5,
  '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
}

// Units accepted when written inside the quantity text. Keep in step with ingredientParser.ts.
const UNIT_WORDS = [
  'cups?', 'tablespoons?', 'tbsps?', 'teaspoons?', 'tsps?',
  'pounds?', 'lbs?', 'ounces?', 'oz',
  'grams?', 'g', 'kilograms?', 'kg',
  'ml', 'milliliters?', 'millilitres?', 'liters?', 'litres?', 'l',
  'pieces?', 'slices?', 'cloves?', 'heads?', 'bunche?s?', 'stalks?', 'sprigs?', 'leaves?',
  'cans?', 'jars?', 'packages?', 'boxes?', 'bags?', 'pinch(?:es)?', 'dash(?:es)?', 'handfuls?',
  'large', 'medium', 'small',
].join('|')

const NUMBER = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|\d*[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])`
const QUANTITY_RE = new RegExp(`^(${NUMBER})\\s*(${UNIT_WORDS})?\\.?$`, 'i')

function numberFromText(text: string): number | null {
  const t = text.trim()
  // Unicode fraction, optionally after a whole number ("1½")
  const uni = t.match(/^(\d*)([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/)
  if (uni) return (uni[1] ? parseInt(uni[1], 10) : 0) + UNICODE_FRACTIONS[uni[2]]
  // Mixed number "1 1/2"
  const mixed = t.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) {
    const d = parseInt(mixed[3], 10)
    return d === 0 ? null : parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / d
  }
  // Simple fraction
  const frac = t.match(/^(\d+)\/(\d+)$/)
  if (frac) {
    const d = parseInt(frac[2], 10)
    return d === 0 ? null : parseInt(frac[1], 10) / d
  }
  // Integer / decimal
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t)
  return null
}

/** Round away binary noise (1/3 -> 0.3333) while keeping useful precision. */
function tidy(n: number): number {
  return Math.round(n * 10000) / 10000
}

/**
 * Parse an Ingredient's quantity (and optional unit field) into a numeric amount.
 * If the quantity text itself contains a unit ("500g") and a different unit is
 * also given, the combination is ambiguous and amount is null.
 */
export function parseAmount(
  quantity: string | null | undefined,
  unit?: string | null
): ParsedAmount {
  const unitField = unit && unit.trim() ? unit.trim() : null
  const fallback: ParsedAmount = { amount: null, unit: unitField }
  if (!quantity) return fallback

  const text = quantity.trim().replace(/\s+/g, ' ')
  const match = text.match(QUANTITY_RE)
  if (!match) return fallback

  const value = numberFromText(match[1])
  if (value === null || !isFinite(value) || value <= 0) return fallback

  const embeddedUnit = match[2] ?? null
  if (embeddedUnit && unitField && embeddedUnit.toLowerCase() !== unitField.toLowerCase()) {
    return fallback
  }

  return { amount: tidy(value), unit: unitField ?? embeddedUnit }
}
