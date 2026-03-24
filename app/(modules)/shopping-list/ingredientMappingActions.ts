'use server'

/**
 * Ingredient Mapping Actions
 *
 * Links recipe ingredient names to master list items so future
 * shopping list syncs can resolve them via explicit lookup (step 3).
 */

import { prisma } from '@/lib/prisma'

/**
 * Create or update an ingredient mapping.
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
