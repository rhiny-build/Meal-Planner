/**
 * Shopping List Helpers
 *
 * Business logic for shopping list generation and ingredient aggregation
 */

import type { AggregatedIngredient, ShoppingListItem } from '@/types'

/**
 * Raw ingredient data from recipes
 */
export interface RawIngredient {
  name: string
  quantity: string | null
  unit: string | null
  recipeName: string
}

/**
 * Normalize an ingredient name for grouping
 * - Lowercase
 * - Remove extra whitespace
 */
export function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Aggregate ingredients from multiple recipes
 * Groups by normalized name, combines quantities when units match
 */
export function aggregateIngredients(
  ingredients: RawIngredient[]
): AggregatedIngredient[] {
  const grouped = new Map<string, AggregatedIngredient>()

  for (const ing of ingredients) {
    const normalizedName = normalizeIngredientName(ing.name)

    if (!grouped.has(normalizedName)) {
      grouped.set(normalizedName, {
        name: ing.name,
        quantities: [],
      })
    }

    const aggregated = grouped.get(normalizedName)!
    aggregated.quantities.push({
      quantity: ing.quantity,
      unit: ing.unit,
      source: ing.recipeName,
    })
  }

  const result: AggregatedIngredient[] = []

  for (const [, agg] of grouped) {
    const units = new Set(agg.quantities.map((q) => q.unit?.toLowerCase() || null))
    const hasConsistentUnits = units.size === 1

    if (hasConsistentUnits && agg.quantities.some((q) => q.quantity)) {
      const unit = agg.quantities[0].unit
      const quantityStrs = agg.quantities
        .filter((q) => q.quantity)
        .map((q) => q.quantity!)

      agg.combinedQuantity = quantityStrs.join(' + ')
      agg.combinedUnit = unit || undefined
    }

    const sources = [...new Set(agg.quantities.map((q) => q.source))]
    agg.notes = `From: ${sources.join(', ')}`

    result.push(agg)
  }

  result.sort((a, b) => a.name.localeCompare(b.name))

  return result
}

/**
 * Collect ingredients from meal plan recipes
 */
export function collectIngredientsFromMealPlans(
  mealPlans: Array<{
    proteinRecipe?: { name: string; structuredIngredients?: Array<{ name: string; quantity: string | null; unit: string | null }> } | null
    carbRecipe?: { name: string; structuredIngredients?: Array<{ name: string; quantity: string | null; unit: string | null }> } | null
    vegetableRecipe?: { name: string; structuredIngredients?: Array<{ name: string; quantity: string | null; unit: string | null }> } | null
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
            quantity: ing.quantity,
            unit: ing.unit,
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
    .map((item) => {
      const parts = []
      if (item.quantity) parts.push(item.quantity)
      if (item.unit) parts.push(item.unit)
      parts.push(item.name)
      return `- ${parts.join(' ')}`
    })
    .join('\n')
}
