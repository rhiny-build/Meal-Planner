/**
 * Meal Plan Helper Functions
 *
 * Shared utilities for meal plan API routes and hooks
 */

import type { RecipeWithIngredients, WeekPlan } from '@/types'

const ALL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * Get the ordered day names for a week starting on the given day.
 * @param startDay - JS Date.getDay() value (0=Sun, 1=Mon, ..., 6=Sat). Defaults to 1 (Monday).
 */
export function getOrderedDays(startDay: number = 1): string[] {
  return [...ALL_DAYS.slice(startDay), ...ALL_DAYS.slice(0, startDay)]
}

/** @deprecated Use getOrderedDays() instead */
export const DAYS = getOrderedDays(1)

export type MealSlotColumn = 'lunch' | 'protein' | 'carb' | 'vegetable'
export type RecipeIdKey = 'lunchRecipeId' | 'proteinRecipeId' | 'carbRecipeId' | 'vegetableRecipeId'

const COLUMN_TO_RECIPE_KEY: Record<MealSlotColumn, RecipeIdKey> = {
  lunch: 'lunchRecipeId',
  protein: 'proteinRecipeId',
  carb: 'carbRecipeId',
  vegetable: 'vegetableRecipeId',
}

/**
 * Map a meal slot column name to its corresponding recipe ID key
 */
export function getRecipeKeyFromColumn(column: MealSlotColumn): RecipeIdKey {
  return COLUMN_TO_RECIPE_KEY[column]
}

/**
 * Calculate the start and end dates for a 7-day week
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
 * Validate that a date falls on the expected week start day
 * @throws Error if date doesn't match the expected start day
 */
export function validateWeekStart(date: Date, startDay: number = 1): void {
  if (date.getDay() !== startDay) {
    const expectedDay = ALL_DAYS[startDay]
    throw new Error(`Start date must be a ${expectedDay}`)
  }
}

/** @deprecated Use validateWeekStart instead */
export function validateMonday(date: Date): void {
  validateWeekStart(date, 1)
}

/**
 * Parse start date from query param or calculate current week's start
 */
export function parseStartDate(paramValue: string | null, startDay: number = 1): Date {
  if (paramValue) {
    return new Date(paramValue)
  }

  const today = new Date()
  const dayOfWeek = today.getDay()
  const diff = (dayOfWeek - startDay + 7) % 7
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - diff)

  return weekStart
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

/**
 * Swap recipes between two days within the same column.
 * Used by drag-and-drop in MealPlanGrid.
 */
export function swapRecipesInPlan(
  weekPlan: WeekPlan[],
  column: MealSlotColumn,
  fromDayIndex: number,
  toDayIndex: number
): WeekPlan[] {
  const newPlan = [...weekPlan]
  const recipeKey = getRecipeKeyFromColumn(column)

  const temp = newPlan[fromDayIndex][recipeKey]
  newPlan[fromDayIndex] = { ...newPlan[fromDayIndex], [recipeKey]: newPlan[toDayIndex][recipeKey] }
  newPlan[toDayIndex] = { ...newPlan[toDayIndex], [recipeKey]: temp }

  return newPlan
}

/**
 * Merge an AI-generated plan into the current week plan.
 * Only days present in modifiedPlan are updated; others are left unchanged.
 */
export function applyGeneratedPlanToWeek(
  weekPlan: WeekPlan[],
  modifiedPlan: { date: Date | string; lunchRecipeId?: string; proteinRecipeId: string; carbRecipeId: string; vegetableRecipeId: string }[]
): WeekPlan[] {
  return weekPlan.map(day => {
    const modification = modifiedPlan.find(m => {
      const modDate = new Date(m.date)
      return modDate.toDateString() === day.date.toDateString()
    })
    if (modification) {
      return {
        ...day,
        lunchRecipeId: modification.lunchRecipeId || '',
        proteinRecipeId: modification.proteinRecipeId || '',
        carbRecipeId: modification.carbRecipeId || '',
        vegetableRecipeId: modification.vegetableRecipeId || '',
      }
    }
    return day
  })
}

/**
 * Create a blank week plan (7 days, all recipe IDs empty).
 */
export function createEmptyWeekPlan(startDate: Date, startDay: number = 1): WeekPlan[] {
  const days = getOrderedDays(startDay)
  return days.map((day, index) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + index)
    return { day, date, lunchRecipeId: '', proteinRecipeId: '', carbRecipeId: '', vegetableRecipeId: '' }
  })
}
