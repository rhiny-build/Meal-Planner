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
import { aggregateIngredients, collectRecipeIngredients } from '@/lib/shopping-list/aggregateRecipeIngredients'
import { findEmbeddingSuggestions } from '@/lib/shopping-list/matchRecipeToMaster'
import { normaliseMasterItems } from '@/lib/shopping-list/normaliseMasterItem'
import { computeEmbeddings } from '@/lib/shopping-list/ingredientEmbeddings'
import { AI_CONFIG } from '@/lib/ai/config'
import { normaliseRecipeIngredient } from '@/lib/shopping-list/normaliseRecipeIngredient'

export type EmbeddingSuggestion = {
  ingredientName: string
  normalisedName: string
  suggestedMasterItemId: string
  suggestedMasterItemName: string
  score: number
}

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
 * Pipeline:
 *   Step 1: Collect and aggregate recipe ingredients
 *   Step 2: Normalise — local rules + optional LLM, produces normalisedName for matching
 *   Step 3: Mapping table lookup — suppress known ingredients (no UI, no computation)
 *   Step 4: Embedding suggestions — surface likely matches for user confirmation
 *   Step 5: Write remaining items to shopping list
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
    normalisedName: string    // normalised e.g. "garlic (fresh)"
    sources: string[]         // recipe names
    resolved: boolean         // set to true when matched in step 3 or 4
    matchConfidence: 'explicit' | 'embedding' | 'unmatched' | 'pending'
    masterItemId: string | null
    similarityScore: number | null // cosine similarity from embedding match
  }

  const items: NormalisedItem[] = await Promise.all(
    aggregatedItems.map(async (item) => {
      const { canonical } = await normaliseRecipeIngredient(item.name)
      return {
        name: item.name,
        normalisedName: canonical || item.name.toLowerCase(),
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
            canonicalName: { in: unresolvedItems.map((i) => i.normalisedName) },
          },
          select: { canonicalName: true, masterItemId: true },
        })
        const rejectedSet = new Set(
          rejectedPairs.map((r) => `${r.canonicalName}::${r.masterItemId}`)
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
    const existing = dedupMap.get(item.normalisedName)
    if (existing) {
      for (const src of item.sources) {
        if (!existing.sources.includes(src)) {
          existing.sources.push(src)
        }
      }
    } else {
      dedupMap.set(item.normalisedName, { ...item })
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
        logLines.push(`  Merged: "${item.normalisedName}" (from: ${item.sources.join(', ')})`)
      }
    }
  }
  logLines.push(`  Final shopping list items: ${dedupedItems.length}`, '')

  // Build shopping list items from deduped ingredients (unmatched + pending)
  const shoppingListData = dedupedItems.map((item, idx) => ({
    name: item.normalisedName,
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
 * Delete a shopping list item by id
 */
export async function deleteShoppingListItem(itemId: string) {
  await prisma.shoppingListItem.delete({
    where: { id: itemId },
  })

  revalidatePath('/shopping-list')
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
    const [result] = await normaliseMasterItems([{ id: item.id, name: item.name }])
    if (result?.baseIngredient) {
      const normalisedName = result.normalisedName ?? result.baseIngredient
      const [embedding] = await computeEmbeddings([normalisedName])
      await prisma.masterListItem.update({
        where: { id: item.id },
        data: { normalisedName, embedding },
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
    const [result] = await normaliseMasterItems([{ id: item.id, name: item.name }])
    if (result?.baseIngredient) {
      const normalisedName = result.normalisedName ?? result.baseIngredient
      const [embedding] = await computeEmbeddings([normalisedName])
      await prisma.masterListItem.update({
        where: { id: item.id },
        data: { normalisedName, embedding },
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

// ============================================================
// Ingredient Mapping Actions
// ============================================================

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
