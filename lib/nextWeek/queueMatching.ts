/**
 * Match new ingredient names right after a recipe is saved, so the Next week list finds the answers ready.
 * Runs after the response is sent (Next's `after`) and never fails the save. Without an API key it does nothing;
 * the Next week page matches whatever is still missing the first time it is built.
 */

import type { PrismaClient } from '@prisma/client'
import { after } from 'next/server'
import { claudeMatcher, resolveIngredientMatches } from './resolveMatches'
import { loadPurchaseContext } from './purchaseContext'

export const QUEUE_MATCH_BUDGET_MS = 60_000

export async function matchIngredientNames(prisma: PrismaClient, names: string[]): Promise<void> {
  try {
    if (names.length === 0) return
    const { items } = await loadPurchaseContext(prisma)
    if (items.length === 0) return
    await resolveIngredientMatches(prisma, names, items, claudeMatcher(), { budgetMs: QUEUE_MATCH_BUDGET_MS })
  } catch (err) {
    console.error('Ingredient matching after save failed', err)
  }
}

/** Call from every place that saves recipe ingredients, with the ingredient names just saved. */
export function queueIngredientMatching(prisma: PrismaClient, names: string[]): void {
  if (!process.env.ANTHROPIC_API_KEY || names.length === 0) return
  const work = () => matchIngredientNames(prisma, names)
  try {
    after(work)
  } catch {
    // Not inside a request (scripts): just run it
    void work()
  }
}
