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
 * Generate shopping list from the week's meal plan + all staples
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

  // Fetch all staples (to be included by default)
  const staples = await prisma.masterListItem.findMany({
    where: { type: 'staple' },
    orderBy: { order: 'asc' },
  })

  // Aggregate meal ingredients
  const allIngredients = collectIngredientsFromMealPlans(mealPlans)
  const aggregatedItems = aggregateIngredients(allIngredients)

  // Prepare meal items
  const mealItems = aggregatedItems.map((item, index) => ({
    name: item.name,
    notes: `For: ${item.sources.join(', ')}`,
    checked: false,
    source: 'meal',
    order: index,
  }))

  // Prepare staple items (start order after meal items)
  const stapleItems = staples.map((staple, index) => ({
    name: staple.name,
    checked: false,
    source: 'staple',
    order: mealItems.length + index,
  }))

  // Upsert shopping list, preserving manual and restock items
  const shoppingList = await prisma.shoppingList.upsert({
    where: { weekStart: normalizedWeekStart },
    create: {
      weekStart: normalizedWeekStart,
      items: {
        create: [...mealItems, ...stapleItems],
      },
    },
    update: {
      updatedAt: new Date(),
      items: {
        // Delete meal and staple items, preserve manual and restock
        deleteMany: { source: { in: ['meal', 'staple'] } },
        create: [...mealItems, ...stapleItems],
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

/**
 * Include a master list item in the weekly shopping list
 * Used for both staples (checking) and restock items (adding)
 */
export async function includeMasterListItem(
  weekStart: Date,
  masterItemId: string,
  itemName: string,
  source: 'staple' | 'restock'
) {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setHours(0, 0, 0, 0)

  // Ensure shopping list exists for this week
  let shoppingList = await prisma.shoppingList.findUnique({
    where: { weekStart: normalizedWeekStart },
  })

  if (!shoppingList) {
    shoppingList = await prisma.shoppingList.create({
      data: { weekStart: normalizedWeekStart },
    })
  }

  // Check if item already exists (by name and source)
  const existing = await prisma.shoppingListItem.findFirst({
    where: {
      shoppingListId: shoppingList.id,
      name: itemName,
      source,
    },
  })

  if (existing) {
    // Item already in list, nothing to do
    revalidatePath('/shopping-list')
    return existing
  }

  // Get max order for positioning
  const maxOrder = await prisma.shoppingListItem.aggregate({
    where: { shoppingListId: shoppingList.id },
    _max: { order: true },
  })

  // Add the item
  const item = await prisma.shoppingListItem.create({
    data: {
      shoppingListId: shoppingList.id,
      name: itemName,
      checked: false,
      source,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  revalidatePath('/shopping-list')
  return item
}

/**
 * Exclude a master list item from the weekly shopping list
 * Used for staples (unchecking) and restock items (removing)
 */
export async function excludeMasterListItem(
  weekStart: Date,
  itemName: string,
  source: 'staple' | 'restock'
) {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setHours(0, 0, 0, 0)

  const shoppingList = await prisma.shoppingList.findUnique({
    where: { weekStart: normalizedWeekStart },
  })

  if (!shoppingList) {
    // No shopping list, nothing to exclude
    return null
  }

  // Delete the item by name and source
  await prisma.shoppingListItem.deleteMany({
    where: {
      shoppingListId: shoppingList.id,
      name: itemName,
      source,
    },
  })

  revalidatePath('/shopping-list')
  return true
}

// ============================================================
// Master List Management Actions
// ============================================================

/**
 * Add a new item to the master list (staples or restock)
 */
export async function addMasterListItem(
  categoryId: string,
  name: string,
  type: 'staple' | 'restock'
) {
  // Get max order within this category for this type
  const maxOrder = await prisma.masterListItem.aggregate({
    where: { categoryId, type },
    _max: { order: true },
  })

  const item = await prisma.masterListItem.create({
    data: {
      categoryId,
      name: name.trim(),
      type,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  revalidatePath('/shopping-list')
  revalidatePath('/settings')
  return item
}

/**
 * Update a master list item's name
 */
export async function updateMasterListItem(itemId: string, name: string) {
  const item = await prisma.masterListItem.update({
    where: { id: itemId },
    data: { name: name.trim() },
  })

  revalidatePath('/shopping-list')
  revalidatePath('/settings')
  return item
}

/**
 * Delete a master list item
 */
export async function deleteMasterListItem(itemId: string) {
  await prisma.masterListItem.delete({
    where: { id: itemId },
  })

  revalidatePath('/shopping-list')
  revalidatePath('/settings')
  return true
}
