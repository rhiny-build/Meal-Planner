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
import { computeEmbeddings } from '@/lib/ai/embeddings'
import { AI_CONFIG } from '@/lib/ai/config'
import { normaliseName } from '@/lib/normalise'

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
 *
 * 5-step matching pipeline:
 *   1. Collect + Aggregate (from meal plans)
 *   2. Normalise (local, no API — produces canonicalName per ingredient)
 *   3. Explicit mapping lookup (IngredientMapping table)
 *   4. Embedding match (for items not resolved in step 3)
 *   5. Cross-recipe dedup + Write (group unmatched by canonicalName)
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
    `Embedding match threshold: ${AI_CONFIG.embeddings.similarityThreshold}`,
    '',
  ]

  // ─── STEP 1: COLLECT + AGGREGATE ────────────────────────────────────
  const mealPlans = await prisma.mealPlan.findMany({
    where: { date: { gte: normalizedWeekStart, lt: weekEnd } },
    include: {
      lunchRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      proteinRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      carbRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
      vegetableRecipe: { include: { structuredIngredients: { orderBy: { order: 'asc' } } } },
    },
  })

  const allIngredients = collectIngredientsFromMealPlans(mealPlans)
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

  // ─── STEP 2: NORMALISE ──────────────────────────────────────────────
  // Local normalisation — no API call. Produces canonicalName per ingredient.
  type NormalisedItem = {
    name: string         // original aggregated name
    canonicalName: string // normalised e.g. "garlic (fresh)"
    sources: string[]    // recipe names
    resolved: boolean    // set to true when matched in step 3 or 4
    matchConfidence: 'explicit' | 'embedding' | 'unmatched'
    masterItemId: string | null
  }

  const items: NormalisedItem[] = aggregatedItems.map((item) => {
    const { canonical } = normaliseName(item.name)
    return {
      name: item.name,
      canonicalName: canonical || item.name.toLowerCase(),
      sources: item.sources,
      resolved: false,
      matchConfidence: 'unmatched' as const,
      masterItemId: null,
    }
  })

  logLines.push(
    '=== STEP 2: NORMALISE ===',
    ...items.map((item) => `  "${item.name}" → "${item.canonicalName}"`),
    '',
  )

  // ─── STEP 3: EXPLICIT MAPPING LOOKUP ────────────────────────────────
  // Check IngredientMapping table for known ingredient→master mappings.
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
          }).catch(() => {})
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

  // ─── STEP 4: EMBEDDING MATCH ────────────────────────────────────────
  // For items not resolved in step 3, embed their canonicalName and compare
  // against MasterListItem embeddings.
  try {
    const unresolvedItems = items.filter((i) => !i.resolved)

    if (unresolvedItems.length > 0) {
      // Fetch master list items with canonicalName and embeddings
      const masterListItems = await prisma.masterListItem.findMany({
        where: {
          canonicalName: { not: null },
          embedding: { isEmpty: false },
        },
        select: { id: true, canonicalName: true, embedding: true, type: true },
      })
      const masterItems = masterListItems.map((item) => ({
        id: item.id,
        canonicalName: item.canonicalName as string,
        embedding: item.embedding,
      }))

      logLines.push('=== STEP 4: EMBEDDING MATCH ===')

      if (masterItems.length > 0) {
        // Embed unresolved canonicalNames
        const textsToEmbed = unresolvedItems.map((i) => i.canonicalName)
        const ingredientEmbeddings = await computeEmbeddings(textsToEmbed)

        // Match against master list
        const matchResults = await matchIngredientsAgainstMasterList({
          recipeIngredients: textsToEmbed,
          masterItems,
          precomputedEmbeddings: ingredientEmbeddings,
        })

        let embeddingMatchCount = 0
        for (let j = 0; j < unresolvedItems.length; j++) {
          const match = matchResults[j]
          const item = unresolvedItems[j]

          if (match.matchedMasterItem) {
            item.resolved = true
            item.matchConfidence = 'embedding'
            item.masterItemId = match.masterItemId
            embeddingMatchCount++
            logLines.push(
              `  ✓ "${item.name}" [${item.canonicalName}] → "${match.matchedMasterItem}" (score: ${match.bestScore.toFixed(4)})`
            )
          } else {
            logLines.push(
              `  ✗ "${item.name}" [${item.canonicalName}] — best: "${match.bestCandidate}" (score: ${match.bestScore.toFixed(4)})`
            )
          }
        }

        const stillUnresolved = items.filter((i) => !i.resolved).length
        logLines.push(
          `  Resolved: ${embeddingMatchCount}/${unresolvedItems.length}, remaining: ${stillUnresolved}`,
          '',
        )
      } else {
        logLines.push('  (no master list items with canonicalName + embeddings)', '')
      }
    } else {
      logLines.push('=== STEP 4: EMBEDDING MATCH ===', '  (all items already resolved)', '')
    }
  } catch (error) {
    console.error('Embedding matching failed, keeping unmatched items:', error)
    logLines.push('=== STEP 4: EMBEDDING MATCH ===', `  (error: ${error})`, '')
  }

  // ─── STEP 5: CROSS-RECIPE DEDUP + WRITE ─────────────────────────────
  // Group remaining unmatched items by canonicalName (string equality).
  // Merge duplicates and combine sources.
  const unresolvedItems = items.filter((i) => !i.resolved)
  const dedupMap = new Map<string, NormalisedItem>()

  for (const item of unresolvedItems) {
    const existing = dedupMap.get(item.canonicalName)
    if (existing) {
      // Merge sources
      for (const src of item.sources) {
        if (!existing.sources.includes(src)) {
          existing.sources.push(src)
        }
      }
    } else {
      dedupMap.set(item.canonicalName, { ...item })
    }
  }

  const dedupedItems = Array.from(dedupMap.values())

  logLines.push(
    '=== STEP 5: CROSS-RECIPE DEDUP ===',
    `  Unmatched items: ${unresolvedItems.length} → ${dedupedItems.length} after dedup`,
  )
  if (unresolvedItems.length > dedupedItems.length) {
    for (const item of dedupedItems) {
      if (item.sources.length > 1) {
        logLines.push(`  Merged: "${item.canonicalName}" (from: ${item.sources.join(', ')})`)
      }
    }
  }
  logLines.push(`  Final shopping list items: ${dedupedItems.length}`, '')

  // Build shopping list items from deduped unmatched ingredients
  const shoppingListData = dedupedItems.map((item, idx) => ({
    name: item.name,
    canonicalName: item.canonicalName,
    matchConfidence: item.matchConfidence,
    masterItemId: item.masterItemId,
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

  writeDebugLog(logLines)
  revalidatePath('/shopping-list')
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
      const canonicalName = result.canonicalName ?? result.baseIngredient
      const [embedding] = await computeEmbeddings([canonicalName])
      await prisma.masterListItem.update({
        where: { id: item.id },
        data: { baseIngredient: result.baseIngredient, canonicalName, embedding },
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
      const canonicalName = result.canonicalName ?? result.baseIngredient
      const [embedding] = await computeEmbeddings([canonicalName])
      await prisma.masterListItem.update({
        where: { id: item.id },
        data: { baseIngredient: result.baseIngredient, canonicalName, embedding },
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
