/**
 * Load everything the "Next week" list needs from the database and build it. Nothing is stored:
 * the list is recomputed from the current PurchaseHistory, product mappings and next week's meal plan
 * on every visit, so it is never stale. Only ticks Ronen changed are kept (NextWeekTick).
 */

import type { PrismaClient } from '@prisma/client'
import { formatDateParam, getWeekStart } from '@/lib/dateUtils'
import { getWeekBounds } from '@/lib/mealPlanHelpers'
import { buildNextWeekList, type ItemInfo, type MealInput, type NextWeekList } from './buildList'
import { claudeMatcher, resolveIngredientMatches, type MatchCall } from './resolveMatches'
import type { MatchItem } from './matchPrompt'
import { WINDOW } from './predict'
import { buildPurchaseContext } from './purchaseContext'

/** Longest the page waits on the model for new ingredient names before showing them as "check" */
export const NEXT_WEEK_MATCH_BUDGET_MS = 25_000

export interface NextWeekData {
  /** Order (delivery) date, YYYY-MM-DD */
  orderDate: string
  /** Number of past orders the prediction is based on */
  orderCount: number
  list: NextWeekList
  /** Products whose item the cheap model has not worked out yet */
  unclassified: number
  /** Ronen's items, for the "which product is it" list and for matching the rest of the recipe book */
  items: MatchItem[]
}

/** The weekday most of the last orders were delivered on (0 = Sunday), by UTC date. */
export function usualOrderWeekday(orderDates: string[]): number {
  const counts = new Map<number, number>()
  for (const date of orderDates.slice(-WINDOW)) {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay()
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 2
}

/** The date within the week (starting `weekStart`) that falls on `weekday`. */
export function orderDateInWeek(weekStart: Date, weekday: number): string {
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    if (d.getDay() === weekday) return formatDateParam(d)
  }
  return formatDateParam(weekStart)
}

/** Ticks are stored against the order date as UTC midnight. */
export const tickDate = (orderDate: string) => new Date(`${orderDate}T00:00:00Z`)

/** Next week's start: the week after the one containing `today`. */
export function nextWeekStart(today: Date, startDay: number): Date {
  const start = getWeekStart(today, startDay)
  start.setDate(start.getDate() + 7)
  return start
}

/** Structured ingredient names, or the older one-per-line text when a recipe has no structured ones. */
function recipeIngredientNames(recipe: { ingredients: string; structuredIngredients: { name: string }[] }): string[] {
  if (recipe.structuredIngredients.length > 0) return recipe.structuredIngredients.map(i => i.name)
  return recipe.ingredients.split('\n').map(l => l.trim()).filter(Boolean)
}

export async function loadNextWeek(
  prisma: PrismaClient,
  weekStart: Date,
  today = new Date(),
  /** Asked only for ingredient names with no saved answer yet (the first visit after new recipes or receipts) */
  matcher: MatchCall = claudeMatcher()
): Promise<NextWeekData> {
  // Everything that does not depend on the receipts is asked for at the same time as the receipts
  const { startDate, endDate } = getWeekBounds(weekStart)
  const [rows, mappings, plan] = await Promise.all([
    prisma.purchaseHistory.findMany({
      where: { orderNumber: { not: null } },
      select: { rawName: true, purchaseDate: true },
    }),
    prisma.productMapping.findMany(),
    prisma.mealPlan.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      orderBy: { date: 'asc' },
      include: {
        proteinRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
        carbRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
        vegetableRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      },
    }),
  ])
  const { history, catalog, items, unclassified } = buildPurchaseContext(rows, mappings)

  const orderDate = orderDateInWeek(weekStart, usualOrderWeekday(history.orders))
  const meals: MealInput[] = plan
    .map(day => {
      const recipes = [day.proteinRecipe, day.carbRecipe, day.vegetableRecipe].filter(r => r !== null)
      return {
        day: day.dayOfWeek.slice(0, 3),
        name: recipes.map(r => r.name).join(' + '),
        ingredients: recipes.flatMap(recipeIngredientNames),
      }
    })
    .filter(meal => meal.name !== '')

  // Saved answers for every ingredient of the planned meals; names with no answer yet are matched now (once, then saved)
  const { matches } = await resolveIngredientMatches(prisma, meals.flatMap(m => m.ingredients), items, matcher, {
    budgetMs: NEXT_WEEK_MATCH_BUDGET_MS,
  })

  // Ticks only live until the order date has passed
  const todayKey = formatDateParam(today)
  // The clean-up and the read run together; a tick for a past order date is ignored here either way
  const firstLiveDate = tickDate(todayKey)
  const [, found] = await Promise.all([
    prisma.nextWeekTick.deleteMany({ where: { orderDate: { lt: firstLiveDate } } }),
    prisma.nextWeekTick.findMany({ where: { orderDate: tickDate(orderDate) } }),
  ])
  const ticks = found.filter(t => t.orderDate >= firstLiveDate)
  const overrides = Object.fromEntries(ticks.map(t => [t.key, t.ticked]))

  return {
    orderDate,
    orderCount: history.orders.length,
    list: buildNextWeekList({ history, catalog, meals, target: orderDate, overrides, matches }),
    unclassified,
    items,
  }
}
