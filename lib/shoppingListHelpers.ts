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
 * Normalize an ingredient name for grouping
 */
export function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Aggregate ingredients from multiple recipes
 * Simply groups by name - no quantity math needed
 * The shopping list just tells you what to buy
 */
export function aggregateIngredients(ingredients: RawIngredient[]): AggregatedItem[] {
  const grouped = new Map<string, AggregatedItem>()

  for (const ing of ingredients) {
    const normalizedName = normalizeIngredientName(ing.name)

    if (!grouped.has(normalizedName)) {
      grouped.set(normalizedName, {
        name: ing.name,
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
    proteinRecipe?: { name: string; structuredIngredients?: Array<{ name: string }> } | null
    carbRecipe?: { name: string; structuredIngredients?: Array<{ name: string }> } | null
    vegetableRecipe?: { name: string; structuredIngredients?: Array<{ name: string }> } | null
  }>
): RawIngredient[] {
  const allIngredients: RawIngredient[] = []

  for (const plan of mealPlans) {
    const recipes = [plan.proteinRecipe, plan.carbRecipe, plan.vegetableRecipe]

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
 * Format shopping list items as text for export
 * Only includes unchecked items
 */
export function formatShoppingListAsText(items: ShoppingListItem[]): string {
  const uncheckedItems = items.filter((item) => !item.checked)

  return uncheckedItems
    .map((item) => `- ${item.name}`)
    .join('\n')
}
