/**
 * Meal Plan Helper Functions
 *
 * Shared utilities for meal plan API routes and hooks
 */

import type { RecipeWithIngredients, WeekPlan } from '@/types'

/**
 * Calculate the start and end dates for a week (Monday-Sunday)
 */
export function getWeekBounds(startDate: Date): { startDate: Date; endDate: Date } {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return { startDate: start, endDate: end }
}

/**
 * Validate that a date is a Monday
 * @throws Error if date is not a Monday
 */
export function validateMonday(date: Date): void {
  if (date.getDay() !== 1) {
    throw new Error('Start date must be a Monday')
  }
}

/**
 * Parse start date from query param or use current week's Monday
 */
export function parseStartDate(paramValue: string | null): Date {
  if (paramValue) {
    return new Date(paramValue)
  }

  // Get current week's Monday
  const today = new Date()
  const dayOfWeek = today.getDay()
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff)

  return monday
}

/**
 * Filter recipes by type for meal plan dropdowns
 */
export function filterRecipesByType(recipes: RecipeWithIngredients[]) {
  return {
    lunchRecipes: recipes.filter(r => r.isLunchAppropriate),
    proteinRecipes: recipes.filter(r => r.proteinType),
    carbRecipes: recipes.filter(r => r.carbType),
    vegetableRecipes: recipes.filter(r => r.vegetableType),
  }
}

/**
 * Calculate the number of selected meals in a week plan
 */
export function calculateSelectedCount(weekPlan: WeekPlan[]): number {
  return weekPlan.reduce((count, day) => {
    if (day.lunchRecipeId) count++
    if (day.proteinRecipeId) count++
    if (day.carbRecipeId) count++
    if (day.vegetableRecipeId) count++
    return count
  }, 0)
}
