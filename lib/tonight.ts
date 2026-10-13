/**
 * Tonight (pure logic)
 *
 * Works out what is for dinner today from a week of meal-plan rows: which
 * recipe is the main, which are the sides, and what is left of the week.
 * Days are matched by weekday name, the way the rest of the meal plan does it,
 * so the time zone of the server never decides which day is "today".
 */

import { getOrderedDays } from '@/lib/mealPlanHelpers'

export type TonightRecipe = {
  id: string
  name: string
  kind: string
  totalTimeMinutes: number | null
}

/** One meal-plan row as returned by GET /api/meal-plan (recipes included). */
export type PlanDay = {
  dayOfWeek: string
  proteinRecipe?: TonightRecipe | null
  carbRecipe?: TonightRecipe | null
  vegetableRecipe?: TonightRecipe | null
}

export type Dinner = {
  main: TonightRecipe
  sides: TonightRecipe[]
}

const WEEKDAY_NAMES = getOrderedDays(0)

export function getWeekdayName(date: Date): string {
  return WEEKDAY_NAMES[date.getDay()]
}

/**
 * Tonight's dinner for one day: the protein is the main; with no protein the
 * carb (a pasta dish), then the vegetable, stands in. The other dinner slots
 * are the sides. Lunch is not dinner. Null when nothing is planned.
 */
export function getDinner(day: PlanDay | null | undefined): Dinner | null {
  if (!day) return null
  const planned = [day.proteinRecipe, day.carbRecipe, day.vegetableRecipe].filter(
    (recipe): recipe is TonightRecipe => Boolean(recipe)
  )
  if (planned.length === 0) return null
  const [main, ...sides] = planned
  return { main, sides }
}

export function findPlanForDay(plans: PlanDay[], date: Date): PlanDay | null {
  const dayName = getWeekdayName(date)
  return plans.find((plan) => plan.dayOfWeek === dayName) ?? null
}

/** The days after `date` in the same week, in week order (the plan's own order). */
export function getRestOfWeek(plans: PlanDay[], date: Date): PlanDay[] {
  const todayIndex = plans.findIndex((plan) => plan.dayOfWeek === getWeekdayName(date))
  return todayIndex === -1 ? [] : plans.slice(todayIndex + 1)
}

/** "40 min", "1 h 15 min"; null when the time is unknown. */
export function formatCookTime(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}
