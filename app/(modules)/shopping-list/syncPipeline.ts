'use server'

/**
 * Shopping List Sync Pipeline
 *
 * 5-step pipeline that syncs meal plan ingredients into the shopping list:
 *   Step 1: Collect and aggregate recipe ingredients
 *   Step 2: Normalise — local rules + optional LLM
 *   Step 3: Mapping table lookup — suppress known ingredients
 *   Step 4: Embedding suggestions — surface likely matches for user confirmation
 *   Step 5: Write remaining items to shopping list
 */

import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/prisma'
import { aggregateIngredients, collectRecipeIngredients } from '@/lib/shopping-list/aggregateRecipeIngredients'
import { findEmbeddingSuggestions } from '@/lib/shopping-list/matchRecipeToMaster'
import { computeEmbeddings } from '@/lib/shopping-list/ingredientEmbeddings'
import { AI_CONFIG } from '@/lib/ai/config'
import { normaliseRecipeIngredient } from '@/lib/shopping-list/normaliseRecipeIngredient'
import { ensureShoppingListExists } from './shoppingListActions'

export type EmbeddingSuggestion = {
  ingredientName: string
  normalisedName: string
  suggestedMasterItemId: string
  suggestedMasterItemName: string
  score: number
}

/**
 * Sync meal ingredients into the shopping list from the current meal plan.
 *
 * Replaces only source='recipe' items, preserving staples/restock/manual.
 */
export async function syncMealIngredients(weekStart: Date) {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(normalizedWeekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  logger.warn('pipeline:start', {
    weekStart: normalizedWeekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    autoThreshold: AI_CONFIG.embeddings.autoMatchThreshold,
    suggestionThreshold: AI_CONFIG.embeddings.suggestionThreshold,
  })

  // ─── Step 1: Collect and aggregate recipe ingredients ───────────────
  const mealPlans = await prisma.mealPlan.findMany({
    where: { date: { gte: normalizedWeekStart, lt: weekEnd } },
    include: {
      lunchRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      proteinRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      carbRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      vegetableRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
    },
  })

  const allIngredients = collectRecipeIngredients(mealPlans)
  const aggregatedItems = aggregateIngredients(allIngredients)

  logger.info('pipeline:step1', {
    mealPlansFound: mealPlans.length,
    rawIngredients: allIngredients.length,
    aggregatedItems: aggregatedItems.length,
  })

  if (aggregatedItems.length === 0) {
    logger.warn('pipeline:no-ingredients', {
      weekStart: normalizedWeekStart.toISOString(),
      mealPlansFound: mealPlans.length,
    })
    const shoppingList = await ensureShoppingListExists(weekStart)
    await prisma.shoppingListItem.deleteMany({
      where: { shoppingListId: shoppingList.id, source: 'recipe' },
    })
    revalidatePath('/shopping-list')
    return
  }

  // ─── Step 2: Normalise — transient normalised form for matching ─────
  type NormalisedItem = {
    name: string              // original aggregated name
    normalisedName: string    // normalised e.g. "garlic (fresh)" — for embedding match
    displayedName: string     // user-facing e.g. "garlic" — written to ShoppingListItem.name
    sources: string[]         // recipe names
    resolved: boolean         // set to true when matched in step 3 or 4
    matchConfidence: 'explicit' | 'embedding' | 'unmatched' | 'pending'
    masterItemId: string | null
    similarityScore: number | null // cosine similarity from embedding match
  }

  const items: NormalisedItem[] = await Promise.all(
    aggregatedItems.map(async (item) => {
      const { canonical, base } = await normaliseRecipeIngredient(item.name)
      return {
        name: item.name,
        normalisedName: canonical || item.name.toLowerCase(),
        displayedName: base || item.name.toLowerCase(),
        sources: item.sources,
        resolved: false,
        matchConfidence: 'unmatched' as const,
        masterItemId: null,
        similarityScore: null,
      }
    })
  )

  logger.info('pipeline:step2', {
    normalisations: items.map((i) => ({ from: i.name, to: i.normalisedName })),
  })

  // ─── Step 3: Mapping table lookup — suppress known ingredients ──────
  try {
    const recipeNames = items.filter((i) => !i.resolved).map((i) => i.name.toLowerCase())
    if (recipeNames.length > 0) {
      const mappings = await prisma.ingredientMapping.findMany({
        where: { recipeName: { in: recipeNames } },
        include: { masterItem: { select: { id: true, name: true, type: true } } },
      })

      const mappingsByName = new Map(mappings.map((m) => [m.recipeName, m]))

      let explicitCount = 0

      for (const item of items) {
        if (item.resolved) continue
        const mapping = mappingsByName.get(item.name.toLowerCase())
        if (mapping) {
          item.resolved = true
          item.matchConfidence = 'explicit'
          item.masterItemId = mapping.masterItemId
          explicitCount++

          prisma.ingredientMapping.update({
            where: { id: mapping.id },
            data: { confirmedCount: { increment: 1 } },
          }).catch((error) => logger.error('pipeline:mapping-update-failed', { error: String(error) }))
        }
      }

      const remaining = items.filter((i) => !i.resolved).length
      logger.info('pipeline:step3', { explicitMatches: explicitCount, remaining })
    } else {
      logger.info('pipeline:step3', { explicitMatches: 0, remaining: 0, note: 'no items to check' })
    }
  } catch (error) {
    logger.error('pipeline:step3-failed', { error: String(error) })
  }

  // ─── Step 4: Embedding suggestions — surface likely matches ────────
  const suggestions: EmbeddingSuggestion[] = []
  const { autoMatchThreshold, suggestionThreshold } = AI_CONFIG.embeddings

  try {
    const unresolvedItems = items.filter((i) => !i.resolved)

    if (unresolvedItems.length > 0) {
      const masterListItems = await prisma.masterListItem.findMany({
        where: {
          normalisedName: { not: null },
          embedding: { isEmpty: false },
        },
        select: { id: true, name: true, normalisedName: true, embedding: true, type: true },
      })
      const masterItems = masterListItems.map((item) => ({
        id: item.id,
        name: item.name,
        normalisedName: item.normalisedName as string,
        embedding: item.embedding,
      }))

      if (masterItems.length > 0) {
        const textsToEmbed = unresolvedItems.map((i) => i.normalisedName)
        const ingredientEmbeddings = await computeEmbeddings(textsToEmbed)

        const matchResults = await findEmbeddingSuggestions({
          recipeIngredients: textsToEmbed,
          masterItems,
          precomputedEmbeddings: ingredientEmbeddings,
          threshold: suggestionThreshold,
        })

        const rejectedPairs = await prisma.rejectedSuggestion.findMany({
          where: {
            normalisedName: { in: unresolvedItems.map((i) => i.normalisedName) },
          },
          select: { normalisedName: true, masterItemId: true },
        })
        const rejectedSet = new Set(
          rejectedPairs.map((r) => `${r.normalisedName}::${r.masterItemId}`)
        )

        let autoMatchCount = 0
        let suggestionCount = 0

        for (let j = 0; j < unresolvedItems.length; j++) {
          const match = matchResults[j]
          const item = unresolvedItems[j]

          if (match.matchedMasterItem && match.bestScore >= autoMatchThreshold) {
            item.resolved = true
            item.matchConfidence = 'embedding'
            item.masterItemId = match.masterItemId
            autoMatchCount++
            logger.info('pipeline:step4:auto', {
              ingredient: item.name,
              normalised: item.normalisedName,
              matchedTo: match.matchedMasterItem,
              score: match.bestScore,
            })

            prisma.ingredientMapping.upsert({
              where: {
                recipeName_masterItemId: {
                  recipeName: item.name.toLowerCase(),
                  masterItemId: match.masterItemId!,
                },
              },
              create: {
                recipeName: item.name.toLowerCase(),
                masterItemId: match.masterItemId!,
                confirmedCount: 1,
              },
              update: { confirmedCount: { increment: 1 } },
            }).catch((error) => logger.error('pipeline:mapping-upsert-failed', { error: String(error) }))

          } else if (match.matchedMasterItem && match.bestScore >= suggestionThreshold) {
            const rejectKey = `${item.normalisedName}::${match.masterItemId}`
            if (rejectedSet.has(rejectKey)) {
              logger.info('pipeline:step4:rejected', {
                ingredient: item.name,
                matchedTo: match.matchedMasterItem,
                score: match.bestScore,
              })
            } else {
              item.matchConfidence = 'pending'
              item.masterItemId = match.masterItemId
              item.similarityScore = match.bestScore
              suggestionCount++
              const masterName = masterItems.find((m) => m.id === match.masterItemId)?.name ?? match.matchedMasterItem
              suggestions.push({
                ingredientName: item.name,
                normalisedName: item.normalisedName,
                suggestedMasterItemId: match.masterItemId!,
                suggestedMasterItemName: masterName,
                score: match.bestScore,
              })
              logger.info('pipeline:step4:suggestion', {
                ingredient: item.name,
                matchedTo: masterName,
                score: match.bestScore,
              })
            }
          } else {
            logger.info('pipeline:step4:unmatched', {
              ingredient: item.name,
              bestCandidate: match.bestCandidate,
              score: match.bestScore,
            })
          }
        }

        const stillUnresolved = items.filter((i) => !i.resolved && i.matchConfidence !== 'pending').length
        logger.info('pipeline:step4:summary', { autoMatched: autoMatchCount, suggestions: suggestionCount, unmatched: stillUnresolved })
      } else {
        logger.warn('pipeline:step4:no-master-items', { note: 'no master list items with normalisedName + embeddings' })
      }
    } else {
      logger.info('pipeline:step4:skipped', { note: 'all items already resolved' })
    }
  } catch (error) {
    logger.error('pipeline:step4-failed', { error: String(error) })
  }

  // ─── Step 5: Write remaining items to shopping list ─────────────────
  const unresolvedItems = items.filter((i) => !i.resolved)
  const dedupMap = new Map<string, NormalisedItem>()

  for (const item of unresolvedItems) {
    const existing = dedupMap.get(item.displayedName)
    if (existing) {
      for (const src of item.sources) {
        if (!existing.sources.includes(src)) {
          existing.sources.push(src)
        }
      }
    } else {
      dedupMap.set(item.displayedName, { ...item })
    }
  }

  const dedupedItems = Array.from(dedupMap.values())

  logger.info('pipeline:step5:dedup', {
    before: unresolvedItems.length,
    after: dedupedItems.length,
  })

  // Build shopping list items from deduped ingredients (unmatched + pending)
  const shoppingListData = dedupedItems.map((item, idx) => ({
    name: item.displayedName,
    matchConfidence: item.matchConfidence,
    masterItemId: item.masterItemId,
    similarityScore: item.similarityScore,
    notes: `For: ${item.sources.join(', ')}`,
    checked: false,
    source: 'recipe' as const,
    order: idx,
  }))

  // Ensure list exists, then replace recipe items
  const shoppingList = await ensureShoppingListExists(weekStart)

  await prisma.shoppingListItem.deleteMany({
    where: { shoppingListId: shoppingList.id, source: 'recipe' },
  })

  if (shoppingListData.length > 0) {
    await prisma.shoppingListItem.createMany({
      data: shoppingListData.map((item) => ({ ...item, shoppingListId: shoppingList.id })),
    })
  }

  await prisma.shoppingList.update({
    where: { id: shoppingList.id },
    data: { stale: false },
  })

  logger.warn('pipeline:complete', {
    itemsWritten: shoppingListData.length,
    suggestions: suggestions.length,
  })

  revalidatePath('/shopping-list')

  return { listId: shoppingList.id, suggestions }
}
