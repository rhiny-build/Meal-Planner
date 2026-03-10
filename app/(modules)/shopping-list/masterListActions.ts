'use server'

/**
 * Master List Server Actions
 *
 * CRUD operations for master list items (staples and restock).
 * Normalisation + embedding is computed in the background after add/update.
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { normaliseIngredients } from '@/lib/ai/normaliseIngredients'
import { computeEmbeddings } from '@/lib/ai/embeddings'

/**
 * Normalise a master list item's name and compute its embedding vector.
 * Used after both add and update to keep data consistent.
 */
async function normaliseAndEmbedItem(itemId: string, itemName: string) {
  const [result] = await normaliseIngredients([{ id: itemId, name: itemName }])
  if (result?.baseIngredient) {
    const canonicalName = result.canonicalName ?? result.baseIngredient
    const [embedding] = await computeEmbeddings([canonicalName])
    await prisma.masterListItem.update({
      where: { id: itemId },
      data: { baseIngredient: result.baseIngredient, canonicalName, embedding },
    })
  }
}

/**
 * Add a new item to the master list (staples or restock)
 */
export async function addMasterListItem(
  categoryId: string,
  name: string,
  type: 'staple' | 'restock'
) {
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

  // Normalise + compute embedding — don't block the user or break the add
  try {
    await normaliseAndEmbedItem(item.id, item.name)
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

  // Re-normalise + recompute embedding after rename
  try {
    await normaliseAndEmbedItem(item.id, item.name)
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
