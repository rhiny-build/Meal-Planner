import type { PrismaClient } from '@prisma/client'
import type { Slot } from './types'

/**
 * Can this recipe go in this slot? The same rule as the slot dropdowns on the Week page: a slot lists the recipes that
 * have its type set (a quick recipe may fill any slot). Returns a problem to show the agent, or null when it is fine.
 */
export async function checkRecipeFitsSlot(prisma: PrismaClient, recipeId: string, slot: Slot): Promise<string | null> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { name: true, kind: true, isLunchAppropriate: true, proteinType: true, carbType: true, vegetableType: true },
  })
  if (!recipe) return `No recipe with id ${recipeId}. Use an id from search_recipes.`
  const fits =
    recipe.kind === 'quick' ||
    (slot === 'lunch' && recipe.isLunchAppropriate) ||
    (slot === 'protein' && !!recipe.proteinType) ||
    (slot === 'carb' && !!recipe.carbType) ||
    (slot === 'vegetable' && !!recipe.vegetableType)
  return fits ? null : `"${recipe.name}" is not a ${slot} recipe. Search with slot="${slot}" to see the ones that fit.`
}
