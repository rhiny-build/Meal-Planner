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

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { revalidatePath } from 'next/cache'
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

  // Debug log lines accumulated across all steps
  const logLines: string[] = [
    `Shopping List Pipeline Debug — ${new Date().toISOString()}`,
    `Embedding match thresholds: auto=${AI_CONFIG.embeddings.autoMatchThreshold}, suggestion=${AI_CONFIG.embeddings.suggestionThreshold}`,
    '',
  ]

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

  logLines.push(
    '=== STEP 1: COLLECT + AGGREGATE ===',
    `  Raw ingredients: ${allIngredients.length} → ${aggregatedItems.length} after aggregation`,
    '',
  )

  if (aggregatedItems.length === 0) {
    // Nothing to process — just clear old recipe items
    const shoppingList = await ensureShoppingListExists(weekStart)
    await prisma.shoppingListItem.deleteMany({
      where: { shoppingListId: shoppingList.id, source: 'recipe' },
    })
    writeDebugLog(logLines)
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

  logLines.push(
    '=== STEP 2: NORMALISE ===',
    ...items.map((item) => `  "${item.name}" → "${item.normalisedName}"`),
    '',
  )

  // ─── Step 3: Mapping table lookup — suppress known ingredients ──────
  try {
    const recipeNames = items.filter((i) => !i.resolved).map((i) => i.name.toLowerCase())
    if (recipeNames.length > 0) {
      const mappings = await prisma.ingredientMapping.findMany({
        where: { recipeName: { in: recipeNames } },
        include: { masterItem: { select: { id: true, name: true, type: true } } },
      })

      const mappingsByName = new Map(mappings.map((m) => [m.recipeName, m]))

      logLines.push('=== STEP 3: EXPLICIT MAPPING LOOKUP ===')
      let explicitCount = 0

      for (const item of items) {
        if (item.resolved) continue
        const mapping = mappingsByName.get(item.name.toLowerCase())
        if (mapping) {
          item.resolved = true
          item.matchConfidence = 'explicit'
          item.masterItemId = mapping.masterItemId
          explicitCount++
          logLines.push(
            `  ✓ "${item.name}" → master:"${mapping.masterItem.name}" (explicit, confirmedCount: ${mapping.confirmedCount})`
          )

          // Increment confirmedCount (fire-and-forget, don't block pipeline)
          prisma.ingredientMapping.update({
            where: { id: mapping.id },
            data: { confirmedCount: { increment: 1 } },
          }).catch((error) => console.error('[Pipeline] DB write failed:', error))
        }
      }

      const remaining = items.filter((i) => !i.resolved).length
      logLines.push(
        `  Resolved: ${explicitCount}/${items.length}, remaining: ${remaining}`,
        '',
      )
    } else {
      logLines.push('=== STEP 3: EXPLICIT MAPPING LOOKUP ===', '  (no items to check)', '')
    }
  } catch (error) {
    logLines.push('=== STEP 3: EXPLICIT MAPPING LOOKUP ===', `  (error: ${error})`, '')
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

      logLines.push('=== STEP 4: EMBEDDING MATCH (two-tier) ===')

      if (masterItems.length > 0) {
        const textsToEmbed = unresolvedItems.map((i) => i.normalisedName)
        const ingredientEmbeddings = await computeEmbeddings(textsToEmbed)

        // Use the lower suggestion threshold to get all potential matches
        const matchResults = await findEmbeddingSuggestions({
          recipeIngredients: textsToEmbed,
          masterItems,
          precomputedEmbeddings: ingredientEmbeddings,
          threshold: suggestionThreshold,
        })

        // Load rejected suggestions to filter them out
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
            // HIGH confidence — auto-resolve and write mapping for future runs
            item.resolved = true
            item.matchConfidence = 'embedding'
            item.masterItemId = match.masterItemId
            autoMatchCount++
            logLines.push(
              `  ✓ AUTO "${item.name}" [${item.normalisedName}] → "${match.matchedMasterItem}" (score: ${match.bestScore.toFixed(4)})`
            )

            // Write mapping so next run resolves via Step 3 (fire-and-forget)
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
            }).catch((error) => console.error('[Pipeline] DB write failed:', error))

          } else if (match.matchedMasterItem && match.bestScore >= suggestionThreshold) {
            // MEDIUM confidence — surface as suggestion (unless previously rejected)
            const rejectKey = `${item.normalisedName}::${match.masterItemId}`
            if (rejectedSet.has(rejectKey)) {
              logLines.push(
                `  ⊘ REJECTED "${item.name}" [${item.normalisedName}] → "${match.matchedMasterItem}" (score: ${match.bestScore.toFixed(4)}, previously rejected)`
              )
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
              logLines.push(
                `  ? SUGGEST "${item.name}" [${item.normalisedName}] → "${match.matchedMasterItem}" (score: ${match.bestScore.toFixed(4)})`
              )
            }
          } else {
            logLines.push(
              `  ✗ "${item.name}" [${item.normalisedName}] — best: "${match.bestCandidate}" (score: ${match.bestScore.toFixed(4)})`
            )
          }
        }

        const stillUnresolved = items.filter((i) => !i.resolved && i.matchConfidence !== 'pending').length
        logLines.push(
          `  Auto-matched: ${autoMatchCount}, Suggestions: ${suggestionCount}, Unmatched: ${stillUnresolved}`,
          '',
        )
      } else {
        logLines.push('  (no master list items with normalisedName + embeddings)', '')
      }
    } else {
      logLines.push('=== STEP 4: EMBEDDING MATCH ===', '  (all items already resolved)', '')
    }
  } catch (error) {
    console.error('Embedding matching failed, keeping unmatched items:', error)
    logLines.push('=== STEP 4: EMBEDDING MATCH ===', `  (error: ${error})`, '')
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

  logLines.push(
    '=== STEP 5: CROSS-RECIPE DEDUP ===',
    `  Unmatched/pending items: ${unresolvedItems.length} → ${dedupedItems.length} after dedup`,
  )
  if (unresolvedItems.length > dedupedItems.length) {
    for (const item of dedupedItems) {
      if (item.sources.length > 1) {
        logLines.push(`  Merged: "${item.displayedName}" (from: ${item.sources.join(', ')})`)
      }
    }
  }
  logLines.push(`  Final shopping list items: ${dedupedItems.length}`, '')

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

  // Reset stale flag — list is now up to date
  await prisma.shoppingList.update({
    where: { id: shoppingList.id },
    data: { stale: false },
  })

  writeDebugLog(logLines)
  revalidatePath('/shopping-list')

  return { listId: shoppingList.id, suggestions }
}

/**
 * Write pipeline debug log to disk.
 */
function writeDebugLog(lines: string[]) {
  try {
    const logDir = join(process.cwd(), 'logs')
    mkdirSync(logDir, { recursive: true })
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    writeFileSync(join(logDir, `shopping-list-sync-${timestamp}.log`), lines.join('\n'))
  } catch (logError) {
    console.error('Failed to write pipeline debug log:', logError)
  }
}
