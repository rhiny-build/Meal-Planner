/**
 * Ingredients for the cook screen.
 *
 * Uses the structured ingredients. Older recipes that only have the legacy
 * one-per-line text get one unscaled entry per line, so cook mode is never
 * empty for them.
 */

import type { CookIngredientData } from '@/components/cook/cookTypes'

interface RecipeIngredientSource {
  ingredients: string
  structuredIngredients: {
    id: string
    name: string
    quantity: string | null
    unit: string | null
    amount: number | null
    notes: string | null
  }[]
}

export function getCookIngredients(recipe: RecipeIngredientSource): CookIngredientData[] {
  if (recipe.structuredIngredients.length > 0) {
    return recipe.structuredIngredients.map((ingredient) => ({
      id: ingredient.id,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      amount: ingredient.amount,
      notes: ingredient.notes,
    }))
  }
  return (recipe.ingredients ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({ id: `legacy-${index}`, name: line }))
}
