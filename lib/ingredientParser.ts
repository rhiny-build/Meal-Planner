/**
 * Ingredient Parsing Utilities
 *
 * Functions for parsing ingredient strings into structured data.
 */

export interface ParsedIngredient {
  name: string
  quantity?: string
  unit?: string
  notes?: string
}

/**
 * Parse an ingredient line into structured components
 * Examples:
 * - "2 cups flour" -> { quantity: "2", unit: "cups", name: "flour" }
 * - "1/2 teaspoon salt" -> { quantity: "1/2", unit: "teaspoon", name: "salt" }
 * - "chicken breast, diced" -> { name: "chicken breast", notes: "diced" }
 * - "Salt and pepper to taste" -> { name: "Salt and pepper", notes: "to taste" }
 */
export function parseIngredientLine(line: string): ParsedIngredient {
  const trimmed = line.trim()
  if (!trimmed) {
    return { name: '' }
  }

  // Common units for matching
  const unitPatterns = [
    'cups?',
    'tablespoons?',
    'tbsp',
    'teaspoons?',
    'tsp',
    'pounds?',
    'lbs?',
    'ounces?',
    'oz',
    'grams?',
    'g',
    'kilograms?',
    'kg',
    'ml',
    'milliliters?',
    'liters?',
    'l',
    'pieces?',
    'slices?',
    'cloves?',
    'heads?',
    'bunche?s?',
    'stalks?',
    'sprigs?',
    'leaves?',
    'cans?',
    'jars?',
    'packages?',
    'boxes?',
    'bags?',
    'pinch(?:es)?',
    'dash(?:es)?',
    'handfuls?',
    'large',
    'medium',
    'small',
  ].join('|')

  // Pattern: [quantity] [unit] [name], [notes]
  // Quantity can be: whole number, fraction, decimal, or combo like "1 1/2"
  const quantityPattern = /^(\d+(?:\s+\d+)?(?:\/\d+)?(?:\.\d+)?)\s*/
  const unitPattern = new RegExp(`^(${unitPatterns})\\s+`, 'i')

  let remaining = trimmed
  let quantity: string | undefined
  let unit: string | undefined
  let notes: string | undefined

  // Extract quantity if present
  const quantityMatch = remaining.match(quantityPattern)
  if (quantityMatch) {
    quantity = quantityMatch[1]
    remaining = remaining.slice(quantityMatch[0].length)
  }

  // Extract unit if present
  const unitMatch = remaining.match(unitPattern)
  if (unitMatch) {
    unit = unitMatch[1].toLowerCase()
    remaining = remaining.slice(unitMatch[0].length)
  }

  // Check for notes in parentheses or after comma
  const notesInParens = remaining.match(/\s*\(([^)]+)\)\s*$/)
  const notesAfterComma = remaining.match(/,\s*([^,]+)$/)

  if (notesInParens) {
    notes = notesInParens[1].trim()
    remaining = remaining.slice(0, -notesInParens[0].length)
  } else if (notesAfterComma) {
    notes = notesAfterComma[1].trim()
    remaining = remaining.slice(0, -notesAfterComma[0].length)
  }

  return {
    name: remaining.trim(),
    quantity,
    unit,
    notes,
  }
}
