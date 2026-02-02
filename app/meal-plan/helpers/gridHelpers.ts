/**
 * Meal Plan Grid Helper Functions
 *
 * Utilities for the MealPlanGrid component.
 */

import type { Recipe } from '@/types'

export interface SelectOption {
  value: string
  label: string
}

/**
 * Convert recipes array to options format for SearchableSelect
 */
export function recipesToOptions(recipes: Recipe[]): SelectOption[] {
  return recipes.map(recipe => ({
    value: String(recipe.id),
    label: recipe.name
  }))
}
