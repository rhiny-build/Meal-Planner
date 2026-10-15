/**
 * Load everything the "Next week" list needs from the database and build it. Nothing is stored:
 * the list is recomputed from the current PurchaseHistory, product mappings and next week's meal plan
 * on every visit, so it is never stale. Only ticks Ronen changed are kept (NextWeekTick).
 */

import type { PrismaClient } from '@prisma/client'
import { formatDateParam, getWeekStart } from '@/lib/dateUtils'
import { getWeekBounds } from '@/lib/mealPlanHelpers'
import { buildNextWeekList, type ItemInfo, type MealInput, type NextWeekList } from './buildList'
import { fallbackItemName } from './itemName'
import { WINDOW, buildHistory, type PurchaseLine } from './predict'

export interface NextWeekData {
  /** Order (delivery) date, YYYY-MM-DD */
  orderDate: string
  /** Number of past orders the prediction is based on */
  orderCount: number
  list: NextWeekList
  /** Products whose item the cheap model has not worked out yet */
  unclassified: number
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

export async function loadNextWeek(prisma: PrismaClient, weekStart: Date, today = new Date()): Promise<NextWeekData> {
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
  const mappingByProduct = new Map(mappings.map(m => [m.productName, m]))
  const itemOf = (product: string) => mappingByProduct.get(product)?.itemName ?? fallbackItemName(product)

  const lines: PurchaseLine[] = rows.map(r => ({
    date: r.purchaseDate.toISOString().slice(0, 10),
    productName: r.rawName,
    item: itemOf(r.rawName),
  }))
  const history = buildHistory(lines)

  const catalog = new Map<string, ItemInfo>()
  for (const [item, product] of history.lastProduct) {
    const mapping = mappingByProduct.get(product)
    catalog.set(item, { aisle: mapping?.aisle ?? 'Other', cupboard: mapping?.cupboard ?? false })
  }

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
    list: buildNextWeekList({ history, catalog, meals, target: orderDate, overrides }),
    unclassified: new Set(lines.filter(l => !mappingByProduct.has(l.productName)).map(l => l.productName)).size,
  }
}
