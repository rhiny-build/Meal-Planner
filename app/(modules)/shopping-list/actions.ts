'use server'

/**
 * Shopping List Server Actions
 *
 * All mutations for the shopping list module.
 * Data fetching happens in server components (page.tsx).
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { aggregateIngredients, collectIngredientsFromMealPlans } from '@/lib/shoppingListHelpers'
import { matchIngredientsAgainstMasterList, type MatchResultItem } from '@/lib/ai/matchIngredients'
import { normaliseIngredients } from '@/lib/ai/normaliseIngredients'
import { computeEmbeddings, deduplicateByEmbedding } from '@/lib/ai/embeddings'
import { AI_CONFIG } from '@/lib/ai/config'

/**
 * Ensure a shopping list exists for the week, creating one with default staples if needed.
 * Used by page.tsx on load and as a safety net in other actions.
 */
export async function ensureShoppingListExists(weekStart: Date) {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setHours(0, 0, 0, 0)

  const existing = await prisma.shoppingList.findUnique({
    where: { weekStart: normalizedWeekStart },
    include: { items: { orderBy: { order: 'asc' } } },
  })

  if (existing) return existing

  const staples = await prisma.masterListItem.findMany({
    where: { type: 'staple' },
    orderBy: { order: 'asc' },
  })

  return prisma.shoppingList.create({
    data: {
      weekStart: normalizedWeekStart,
      items: {
        create: staples.map((staple, index) => ({
          name: staple.name,
          checked: false,
          source: 'staple',
          order: index,
        })),
      },
    },
    include: { items: { orderBy: { order: 'asc' } } },
  })
}

/**
 * Sync meal ingredients into the shopping list from the current meal plan.
 * Replaces only source='meal' items, preserving staples/restock/manual.
 */
export async function syncMealIngredients(weekStart: Date) {
  // console.time('[sync] total')
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(normalizedWeekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  // Fetch meal plans for the week
  // console.time('[sync] fetch meal plans')
  const mealPlans = await prisma.mealPlan.findMany({
    where: { date: { gte: normalizedWeekStart, lt: weekEnd } },
    include: {
      lunchRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      proteinRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      carbRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      vegetableRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
    },
  })
  // console.timeEnd('[sync] fetch meal plans')

  // Aggregate meal ingredients
  const allIngredients = collectIngredientsFromMealPlans(mealPlans)
  let aggregatedItems = aggregateIngredients(allIngredients)
  // console.log(`[sync] ${allIngredients.length} total ingredients from meals`)
  // console.log(`[sync] ${aggregatedItems.length} aggregated ingredients`)

  // Match ingredients against master list to filter out staples/restock
  let matchResults: MatchResultItem[] | null = null

  try {
    // console.time('[sync] fetch master list')
    const masterListItems = await prisma.masterListItem.findMany({
      where: {
        baseIngredient: { not: null },
        embedding: { isEmpty: false },
      },
      select: { baseIngredient: true, embedding: true },
    })
    const masterItems = masterListItems.map((item) => ({
      baseIngredient: item.baseIngredient as string,
      embedding: item.embedding,
    }))
    // console.timeEnd('[sync] fetch master list')
    // console.log(`[sync] ${masterItems.length} master list items with embeddings`)

    if (aggregatedItems.length > 0) {
      // 1. Compute embeddings for all aggregated ingredients (one API call)
      // console.time('[sync] compute embeddings')
      const ingredientEmbeddings = await computeEmbeddings(
        aggregatedItems.map((item) => item.name)
      )
      // console.timeEnd('[sync] compute embeddings')

      // 2. Deduplicate within the list using embedding similarity
      // console.time('[sync] deduplicate ingredients')
      const dedupThreshold = AI_CONFIG.embeddings.deduplicationThreshold
      const { items: dedupedItems, embeddings: dedupedEmbeddings, mergeLog, nearMissLog } =
        deduplicateByEmbedding(aggregatedItems, ingredientEmbeddings, dedupThreshold)
      // console.log(`[sync] Deduped ${aggregatedItems.length} → ${dedupedItems.length} ingredients (${aggregatedItems.length - dedupedItems.length} merged)`)
      // console.timeEnd('[sync] deduplicate ingredients')

      // 3. Match deduped ingredients against master list (reuse precomputed embeddings)
      if (masterItems.length > 0) {
        // console.time('[sync] embedding match ingredients')
        matchResults = await matchIngredientsAgainstMasterList({
          recipeIngredients: dedupedItems.map((item) => item.name),
          masterItems,
          precomputedEmbeddings: dedupedEmbeddings,
        })
        // console.log(`[sync] Matched ${matchResults.filter((r) => r.matchedMasterItem).length} ingredients to master list`)
        // console.timeEnd('[sync] embedding match ingredients')
      }

      // Use deduped items for building shopping list
      aggregatedItems = dedupedItems

      // Write debug log with dedup clusters + similarity scores
      try {
        const logDir = join(process.cwd(), 'logs')
        mkdirSync(logDir, { recursive: true })
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const masterThreshold = AI_CONFIG.embeddings.similarityThreshold
        const lines = [
          `Embedding Match Debug — ${new Date().toISOString()}`,
          `Dedup threshold: ${dedupThreshold}`,
          `Master list threshold: ${masterThreshold}`,
          `Recipe ingredients: ${ingredientEmbeddings.length} → ${dedupedItems.length} after dedup`,
          `Master list items: ${masterItems.length}`,
          '',
          'DEDUP MERGES:',
          ...(mergeLog.length > 0
            ? mergeLog
            : ['  (none)']),
          '',
          'DEDUP NEAR MISSES (score ≥ 0.75 but below threshold):',
          ...(nearMissLog.length > 0
            ? nearMissLog
            : ['  (none)']),
          '',
          ...(matchResults
            ? [
                'MATCHED (filtered from shopping list):',
                ...matchResults
                  .filter((r) => r.matchedMasterItem)
                  .map((r) => `  ✓ "${r.name}" → "${r.matchedMasterItem}" (score: ${r.bestScore.toFixed(4)})`),
                '',
                'UNMATCHED (kept on shopping list):',
                ...matchResults
                  .filter((r) => !r.matchedMasterItem)
                  .map((r) => `  ✗ "${r.name}" — best: "${r.bestCandidate}" (score: ${r.bestScore.toFixed(4)})`),
              ]
            : ['(no master list items — all ingredients kept)']),
        ]
        writeFileSync(join(logDir, `embedding-match-${timestamp}.log`), lines.join('\n'))
      } catch (logError) {
        console.error('Failed to write embedding match debug log:', logError)
      }
    }
  } catch (error) {
    // console.timeEnd('[sync] embedding match ingredients')
    console.error('Ingredient matching failed, including all items:', error)
  }

  // Build meal items — filter out matched ingredients, include debug info in notes
  const mealItems: Array<{ name: string; notes: string; checked: boolean; source: 'meal'; order: number }> = []
  let order = 0

  for (let i = 0; i < aggregatedItems.length; i++) {
    const item = aggregatedItems[i]
    const match = matchResults?.find((r) => r.index === i)
    const baseIngredient = match?.baseIngredient ?? item.name.toLowerCase()
    const matchedWith = match?.matchedMasterItem ?? null

    // Skip items that matched a master list item
    if (matchedWith) continue

    const sourcesNote = `For: ${item.sources.join(', ')}`
    // DEBUG: append base ingredient for visibility
    const debugNote = ` [base: ${baseIngredient}]`

    mealItems.push({
      name: item.name,
      notes: sourcesNote + debugNote,
      checked: false,
      source: 'meal' as const,
      order: order++,
    })
  }

  // Ensure list exists (with staples if new)
  // console.time('[sync] db writes')
  const shoppingList = await ensureShoppingListExists(weekStart)

  // Replace only meal items
  await prisma.shoppingListItem.deleteMany({
    where: { shoppingListId: shoppingList.id, source: 'meal' },
  })

  if (mealItems.length > 0) {
    await prisma.shoppingListItem.createMany({
      data: mealItems.map(item => ({ ...item, shoppingListId: shoppingList.id })),
    })
  }
  // console.timeEnd('[sync] db writes')

  revalidatePath('/shopping-list')
  // console.timeEnd('[sync] total')
}

/**
 * Toggle item checked status
 */
export async function toggleItem(itemId: string, checked: boolean) {
  const item = await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: { checked },
  })

  revalidatePath('/shopping-list')
  return item
}

/**
 * Add a manual item to the shopping list
 */
export async function addItem(shoppingListId: string, name: string) {
  // Get the current max order for this list
  const maxOrder = await prisma.shoppingListItem.aggregate({
    where: { shoppingListId },
    _max: { order: true },
  })

  const item = await prisma.shoppingListItem.create({
    data: {
      shoppingListId,
      name,
      checked: false,
      source: 'manual',
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  revalidatePath('/shopping-list')
  return item
}

/**
 * Get shopping list for a specific week
 * This is used by the server component for initial data fetch
 */
export async function getShoppingList(weekStart: Date) {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setHours(0, 0, 0, 0)

  const shoppingList = await prisma.shoppingList.findUnique({
    where: { weekStart: normalizedWeekStart },
    include: {
      items: {
        orderBy: { order: 'asc' },
      },
    },
  })

  return shoppingList
}

/**
 * Include a master list item in the weekly shopping list
 * Used for both staples (checking) and restock items (adding)
 */
export async function includeMasterListItem(
  weekStart: Date,
  masterItemId: string,
  itemName: string,
  source: 'staple' | 'restock'
) {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setHours(0, 0, 0, 0)

  // Ensure shopping list exists for this week
  let shoppingList = await prisma.shoppingList.findUnique({
    where: { weekStart: normalizedWeekStart },
  })

  if (!shoppingList) {
    shoppingList = await prisma.shoppingList.create({
      data: { weekStart: normalizedWeekStart },
    })
  }

  // Check if item already exists (by name and source)
  const existing = await prisma.shoppingListItem.findFirst({
    where: {
      shoppingListId: shoppingList.id,
      name: itemName,
      source,
    },
  })

  if (existing) {
    // Item already in list, nothing to do
    revalidatePath('/shopping-list')
    return existing
  }

  // Get max order for positioning
  const maxOrder = await prisma.shoppingListItem.aggregate({
    where: { shoppingListId: shoppingList.id },
    _max: { order: true },
  })

  // Add the item
  const item = await prisma.shoppingListItem.create({
    data: {
      shoppingListId: shoppingList.id,
      name: itemName,
      checked: false,
      source,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  revalidatePath('/shopping-list')
  return item
}

/**
 * Exclude a master list item from the weekly shopping list
 * Used for staples (unchecking) and restock items (removing)
 */
export async function excludeMasterListItem(
  weekStart: Date,
  itemName: string,
  source: 'staple' | 'restock'
) {
  // Ensure list exists (auto-creates with staples if needed)
  const shoppingList = await ensureShoppingListExists(weekStart)

  // Delete the item by name and source
  await prisma.shoppingListItem.deleteMany({
    where: {
      shoppingListId: shoppingList.id,
      name: itemName,
      source,
    },
  })

  revalidatePath('/shopping-list')
  return true
}

// ============================================================
// Master List Management Actions
// ============================================================

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
    const [result] = await normaliseIngredients([{ id: item.id, name: item.name }])
    if (result?.baseIngredient) {
      const textToEmbed = result.baseIngredient
      const [embedding] = await computeEmbeddings([textToEmbed])
      await prisma.masterListItem.update({
        where: { id: item.id },
        data: { baseIngredient: result.baseIngredient, embedding },
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
    const [result] = await normaliseIngredients([{ id: item.id, name: item.name }])
    if (result?.baseIngredient) {
      const textToEmbed = result.baseIngredient
      const [embedding] = await computeEmbeddings([textToEmbed])
      await prisma.masterListItem.update({
        where: { id: item.id },
        data: { baseIngredient: result.baseIngredient, embedding },
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
