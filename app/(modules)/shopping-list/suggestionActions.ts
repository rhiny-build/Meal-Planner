'use server'

/**
 * Suggestion Resolution Actions
 *
 * Three actions for resolving embedding suggestions surfaced
 * during shopping list generation (matchConfidence: 'pending').
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createIngredientMapping } from './actions'

/**
 * Confirm a suggestion — the suggested master item is correct.
 * Writes a mapping for future runs and removes the item from the shopping list.
 */
export async function confirmSuggestion(
  shoppingListItemId: string,
  masterItemId: string,
) {
  const item = await prisma.shoppingListItem.findUniqueOrThrow({
    where: { id: shoppingListItemId },
  })

  await createIngredientMapping(item.name, masterItemId)

  await prisma.shoppingListItem.delete({
    where: { id: shoppingListItemId },
  })

  revalidatePath('/shopping-list')
}

/**
 * Reassign a suggestion — the user picks a different master item.
 * Writes a mapping with the chosen item and removes from the shopping list.
 */
export async function reassignSuggestion(
  shoppingListItemId: string,
  newMasterItemId: string,
) {
  const item = await prisma.shoppingListItem.findUniqueOrThrow({
    where: { id: shoppingListItemId },
  })

  await createIngredientMapping(item.name, newMasterItemId)

  await prisma.shoppingListItem.delete({
    where: { id: shoppingListItemId },
  })

  revalidatePath('/shopping-list')
}

/**
 * Reject a suggestion — the ingredient is NOT covered by the suggested master item.
 * Records the rejection so it won't be suggested again, and marks the item as unmatched.
 */
export async function rejectSuggestion(
  shoppingListItemId: string,
  masterItemId: string,
  canonicalName: string,
) {
  // Record rejection (idempotent via upsert on unique constraint)
  await prisma.rejectedSuggestion.upsert({
    where: {
      canonicalName_masterItemId: { canonicalName, masterItemId },
    },
    create: { canonicalName, masterItemId },
    update: {},
  })

  // Update item: pending → unmatched, clear master item reference
  await prisma.shoppingListItem.update({
    where: { id: shoppingListItemId },
    data: {
      matchConfidence: 'unmatched',
      masterItemId: null,
      similarityScore: null,
    },
  })

  revalidatePath('/shopping-list')
}
