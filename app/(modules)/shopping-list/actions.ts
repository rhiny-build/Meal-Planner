'use server'

/**
 * Shopping List Server Actions
 *
 * All mutations for the shopping list module.
 * Data fetching happens in server components (page.tsx).
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { aggregateIngredients, collectIngredientsFromMealPlans } from '@/lib/shoppingListHelpers'

/**
 * Generate shopping list from the week's meal plan
 */
export async function generateShoppingList(weekStart: Date) {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(normalizedWeekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  // Fetch meal plans for the week
  const mealPlans = await prisma.mealPlan.findMany({
    where: { date: { gte: normalizedWeekStart, lt: weekEnd } },
    include: {
      lunchRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      proteinRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      carbRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      vegetableRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
    },
  })

  // Aggregate ingredients
  const allIngredients = collectIngredientsFromMealPlans(mealPlans)
  const aggregatedItems = aggregateIngredients(allIngredients)

  // Upsert shopping list, preserving manual items
  const shoppingList = await prisma.shoppingList.upsert({
    where: { weekStart: normalizedWeekStart },
    create: {
      weekStart: normalizedWeekStart,
      items: {
        create: aggregatedItems.map((item, index) => ({
          name: item.name,
          notes: `For: ${item.sources.join(', ')}`,
          checked: false,
          source: 'meal',
          order: index,
        })),
      },
    },
    update: {
      updatedAt: new Date(),
      items: {
        // Delete only meal-sourced items, preserve manual/staple/restock
        deleteMany: { source: 'meal' },
        create: aggregatedItems.map((item, index) => ({
          name: item.name,
          notes: `For: ${item.sources.join(', ')}`,
          checked: false,
          source: 'meal',
          order: index,
        })),
      },
    },
    include: { items: { orderBy: { order: 'asc' } } },
  })

  revalidatePath('/shopping-list')
  return shoppingList
}

/**
 * Toggle item checked status
 */
export async function toggleItem(itemId: string, checked: boolean) {
  const item = await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: { checked },
  })

  revalidatePath('/shopping-list')
  return item
}

/**
 * Add a manual item to the shopping list
 */
export async function addItem(shoppingListId: string, name: string) {
  // Get the current max order for this list
  const maxOrder = await prisma.shoppingListItem.aggregate({
    where: { shoppingListId },
    _max: { order: true },
  })

  const item = await prisma.shoppingListItem.create({
    data: {
      shoppingListId,
      name,
      checked: false,
      source: 'manual',
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  revalidatePath('/shopping-list')
  return item
}

/**
 * Get shopping list for a specific week
 * This is used by the server component for initial data fetch
 */
export async function getShoppingList(weekStart: Date) {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setHours(0, 0, 0, 0)

  const shoppingList = await prisma.shoppingList.findUnique({
    where: { weekStart: normalizedWeekStart },
    include: {
      items: {
        orderBy: { order: 'asc' },
      },
    },
  })

  return shoppingList
}
