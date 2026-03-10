'use server'

/**
 * Ingredient Mapping Server Actions
 *
 * Manages learned mappings from recipe ingredient names to master list items.
 * These mappings power Step 3 (explicit lookup) of the shopping list sync pipeline.
 */

import { prisma } from '@/lib/prisma'

/**
 * Create or update an ingredient mapping.
 * Links a recipe ingredient name to a master list item so future
 * shopping list syncs can resolve it via explicit lookup (step 3).
 *
 * Upserts: if the mapping already exists, increments confirmedCount.
 */
export async function createIngredientMapping(
  recipeName: string,
  masterItemId: string,
) {
  const mapping = await prisma.ingredientMapping.upsert({
    where: {
      recipeName_masterItemId: { recipeName: recipeName.toLowerCase(), masterItemId },
    },
    create: {
      recipeName: recipeName.toLowerCase(),
      masterItemId,
      confirmedCount: 1,
    },
    update: {
      confirmedCount: { increment: 1 },
    },
  })

  return mapping
}
