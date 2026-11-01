/**
 * Match new ingredient names right after a recipe is saved, so the Next week list finds the answers ready.
 * Runs after the response is sent (Next's `after`) and never fails the save. Without an API key it does nothing;
 * the Next week page matches whatever is still missing the first time it is built.
 */

import type { PrismaClient } from '@prisma/client'
import { after } from 'next/server'
import type { MatchItem } from './matchPrompt'
import { claudeMatcher, resolveIngredientMatches } from './resolveMatches'
import { loadPurchaseContext } from './purchaseContext'

export const QUEUE_MATCH_BUDGET_MS = 40_000
/** Whole recipe book, after the page is sent: inside the 60 s page limit, which also covers work after the response */
export const BOOK_MATCH_BUDGET_MS = 40_000

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

/** Every distinct ingredient name in the recipe book (structured ones, or the older text lines when a recipe has none). */
export async function bookIngredientNames(prisma: PrismaClient): Promise<string[]> {
  const recipes = await prisma.recipe.findMany({
    select: { ingredients: true, structuredIngredients: { select: { name: true } } },
  })
  return recipes.flatMap(r =>
    r.structuredIngredients.length > 0
      ? r.structuredIngredients.map(i => i.name)
      : r.ingredients.split('\n').map(l => l.trim()).filter(Boolean)
  )
}

/**
 * After the Next week page is sent: give every ingredient in the recipe book a saved answer (the first visit
 * covers the ~350 existing names; later visits only pick up new names and re-ask "not bought"/"unsure" when
 * Ronen's items changed). The page itself only waits for the names of next week's meals.
 */
export function queueBookMatching(prisma: PrismaClient, items: MatchItem[]): void {
  if (!process.env.ANTHROPIC_API_KEY || items.length === 0) return
  const work = async () => {
    try {
      const names = await bookIngredientNames(prisma)
      await resolveIngredientMatches(prisma, names, items, claudeMatcher(), { budgetMs: BOOK_MATCH_BUDGET_MS })
    } catch (err) {
      console.error('Ingredient matching for the recipe book failed', err)
    }
  }
  try {
    after(work)
  } catch {
    void work()
  }
}
