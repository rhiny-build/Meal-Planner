/**
 * Shopping List Helpers
 *
 * Business logic for shopping list generation and ingredient aggregation
 */

import type { ShoppingListItem } from '@/types'

/**
 * Raw ingredient data from recipes
 */
export interface RawIngredient {
  name: string
  recipeName: string
}

/**
 * Aggregated ingredient for shopping list
 */
export interface AggregatedItem {
  name: string
  sources: string[]
}

/**
 * Strip quantity and unit prefixes from ingredient names
 * E.g., "2 lb chicken" → "chicken", "500g beef" → "beef"
 */
export function stripUnitsFromName(name: string): string {
  // Units list (will match with or without trailing period/s)
  const units = [
    'lb', 'lbs', 'pound', 'pounds',
    'oz', 'ounce', 'ounces',
    'g', 'gram', 'grams',
    'kg', 'kilogram', 'kilograms',
    'ml', 'milliliter', 'milliliters',
    'l', 'liter', 'liters', 'litre', 'litres',
    'cup', 'cups',
    'tbsp', 'tablespoon', 'tablespoons', 'tbs',
    'tsp', 'teaspoon', 'teaspoons',
    'bunch', 'bunches',
    'can', 'cans',
    'clove', 'cloves',
    'piece', 'pieces',
    'slice', 'slices',
    'head', 'heads',
    'stalk', 'stalks',
    'sprig', 'sprigs',
    'pinch', 'pinches',
    'handful', 'handfuls',
    'dash', 'dashes',
    'large', 'medium', 'small',
  ]

  const unitGroup = units.join('|')
  let cleaned = name

  // Strip parenthetical quantities like "(5-6 oz)" or "(1 lb)" anywhere in the string
  cleaned = cleaned.replace(/\s*\([^)]*(?:oz|lb|g|kg|ml|cup|tbsp|tsp)[^)]*\)\s*/gi, ' ')

  // Strip quantity + unit prefix: "2 lb chicken" → "chicken"
  const quantityUnitPattern = new RegExp(
    `^[\\d½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞][\\d./\\s\\-½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]*\\s*(?:${unitGroup})\\.?\\s+`,
    'i'
  )
  cleaned = cleaned.replace(quantityUnitPattern, '')

  // Strip unit-only prefix without number: "lb. ground beef" → "ground beef"
  const unitOnlyPattern = new RegExp(
    `^(?:${unitGroup})\\.?\\s+`,
    'i'
  )
  cleaned = cleaned.replace(unitOnlyPattern, '')

  // Strip leading numbers without units (e.g., "2 chicken breasts")
  cleaned = cleaned.replace(/^[\d½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞][\d./\s\-½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]*\s+/, '')

  return cleaned.trim() || name.trim()
}

/**
 * Aggregate ingredients from multiple recipes
 * Simply groups by name - no quantity math needed
 * The shopping list just tells you what to buy
 */
export function aggregateIngredients(ingredients: RawIngredient[]): AggregatedItem[] {
  const grouped = new Map<string, AggregatedItem>()

  for (const ing of ingredients) {
    const cleanName = stripUnitsFromName(ing.name)
    const normalizedName = cleanName.toLowerCase().trim().replace(/\s+/g, ' ')

    if (!grouped.has(normalizedName)) {
      grouped.set(normalizedName, {
        name: cleanName,
        sources: [],
      })
    }

    const aggregated = grouped.get(normalizedName)!
    if (!aggregated.sources.includes(ing.recipeName)) {
      aggregated.sources.push(ing.recipeName)
    }
  }

  const result = Array.from(grouped.values())
  result.sort((a, b) => a.name.localeCompare(b.name))

  return result
}

/**
 * Collect ingredients from meal plan recipes
 */
export function collectIngredientsFromMealPlans(
  mealPlans: Array<{
    lunchRecipe?: { name: string; structuredIngredients?: Array<{ name: string }> } | null
    proteinRecipe?: { name: string; structuredIngredients?: Array<{ name: string }> } | null
    carbRecipe?: { name: string; structuredIngredients?: Array<{ name: string }> } | null
    vegetableRecipe?: { name: string; structuredIngredients?: Array<{ name: string }> } | null
  }>
): RawIngredient[] {
  const allIngredients: RawIngredient[] = []

  for (const plan of mealPlans) {
    const recipes = [plan.lunchRecipe, plan.proteinRecipe, plan.carbRecipe, plan.vegetableRecipe]

    for (const recipe of recipes) {
      if (recipe?.structuredIngredients) {
        for (const ing of recipe.structuredIngredients) {
          allIngredients.push({
            name: ing.name,
            recipeName: recipe.name,
          })
        }
      }
    }
  }

  return allIngredients
}

/**
 * Filter out aggregated ingredients that match master list base ingredients.
 * Both sides must already be normalised to base concepts.
 */
export function filterByMasterList(
  items: Array<{ item: AggregatedItem; baseIngredient: string }>,
  masterBaseIngredients: Set<string>
): AggregatedItem[] {
  return items
    .filter(({ baseIngredient }) => !masterBaseIngredients.has(baseIngredient))
    .map(({ item }) => item)
}

/**
 * Format shopping list items as text for export
 * Only includes unchecked items
 */
export function formatShoppingListAsText(items: ShoppingListItem[]): string {
  const uncheckedItems = items.filter((item) => !item.checked)

  return uncheckedItems
    .map((item) => `- ${item.name}`)
    .join('\n')
}
