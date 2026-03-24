'use server'

/**
 * Master List Management Actions
 *
 * CRUD operations for master list items (staples and restock).
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { normaliseMasterItems } from '@/lib/shopping-list/normaliseMasterItem'
import { computeEmbeddings } from '@/lib/shopping-list/ingredientEmbeddings'

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

  // Normalise + compute embedding in the background — don't block the user or break the add
  try {
    const [result] = await normaliseMasterItems([{ id: item.id, name: item.name }])
    if (result?.baseIngredient) {
      const normalisedName = result.normalisedName ?? result.baseIngredient
      const [embedding] = await computeEmbeddings([normalisedName])
      await prisma.masterListItem.update({
        where: { id: item.id },
        data: { normalisedName, embedding },
      })
    }
  } catch (error) {
    console.error('Failed to normalise/embed new master list item:', error)
  }

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

  // Re-normalise + recompute embedding after rename — don't block the user or break the update
  try {
    const [result] = await normaliseMasterItems([{ id: item.id, name: item.name }])
    if (result?.baseIngredient) {
      const normalisedName = result.normalisedName ?? result.baseIngredient
      const [embedding] = await computeEmbeddings([normalisedName])
      await prisma.masterListItem.update({
        where: { id: item.id },
        data: { normalisedName, embedding },
      })
    }
  } catch (error) {
    console.error('Failed to re-normalise/embed master list item:', error)
  }

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
