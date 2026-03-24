'use server'

/**
 * Shopping List Item Actions
 *
 * Core CRUD operations for shopping list items:
 * ensure list exists, toggle, add, delete, get, include/exclude master items.
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

/**
 * Ensure a shopping list exists for the week, creating one with default staples if needed.
 * Used by page.tsx on load and as a safety net in other actions.
 */
export async function ensureShoppingListExists(weekStart: Date) {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setHours(0, 0, 0, 0)

  const existing = await prisma.shoppingList.findUnique({
    where: { weekStart: normalizedWeekStart },
    include: { items: { orderBy: { order: 'asc' } } },
  })

  if (existing) return existing

  const staples = await prisma.masterListItem.findMany({
    where: { type: 'staple' },
    orderBy: { order: 'asc' },
  })

  return prisma.shoppingList.create({
    data: {
      weekStart: normalizedWeekStart,
      items: {
        create: staples.map((staple, index) => ({
          name: staple.name,
          checked: false,
          source: 'staple',
          order: index,
        })),
      },
    },
    include: { items: { orderBy: { order: 'asc' } } },
  })
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
 * Delete a shopping list item by id
 */
export async function deleteShoppingListItem(itemId: string) {
  await prisma.shoppingListItem.delete({
    where: { id: itemId },
  })

  revalidatePath('/shopping-list')
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
  // Ensure list exists (auto-creates with staples if needed)
  const shoppingList = await ensureShoppingListExists(weekStart)

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
