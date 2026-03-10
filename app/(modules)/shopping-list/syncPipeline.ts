'use server'

/**
 * Shopping List Sync Pipeline
 *
 * 5-step pipeline that syncs meal plan ingredients into the shopping list:
 *   1. Collect + Aggregate (from meal plans)
 *   2. Normalise (local rules, then LLM fallback with DB cache)
 *   3. Explicit mapping lookup (IngredientMapping table)
 *   4. Embedding match (for items not resolved in step 3)
 *   5. Cross-recipe dedup + Write (group unmatched by canonicalName)
 *
 * Replaces only source='recipe' items, preserving staples/restock/manual.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { aggregateIngredients, collectIngredientsFromMealPlans } from '@/lib/shoppingListHelpers'
import { matchIngredientsAgainstMasterList } from '@/lib/ai/matchIngredients'
import { computeEmbeddings } from '@/lib/ai/embeddings'
import { AI_CONFIG } from '@/lib/ai/config'
import { normaliseIngredientCached } from '@/lib/normalisation/normaliseWithFallback'
import { ensureShoppingListExists } from './actions'

// ─── Types ──────────────────────────────────────────────────────────────

type NormalisedItem = {
  name: string         // original aggregated name
  canonicalName: string // normalised e.g. "garlic (fresh)"
  sources: string[]    // recipe names
  resolved: boolean    // set to true when matched in step 3 or 4
  matchConfidence: 'explicit' | 'embedding' | 'unmatched'
  masterItemId: string | null
}

// ─── Pipeline Orchestrator ──────────────────────────────────────────────

export async function syncMealIngredients(weekStart: Date) {
  const normalizedWeekStart = new Date(weekStart)
  normalizedWeekStart.setHours(0, 0, 0, 0)

  const logLines: string[] = [
    `Shopping List Pipeline Debug — ${new Date().toISOString()}`,
    `Embedding match threshold: ${AI_CONFIG.embeddings.similarityThreshold}`,
    '',
  ]

  // Step 1: Collect + Aggregate
  const aggregatedItems = await collectAndAggregate(normalizedWeekStart, logLines)

  if (aggregatedItems.length === 0) {
    const shoppingList = await ensureShoppingListExists(weekStart)
    await prisma.shoppingListItem.deleteMany({
      where: { shoppingListId: shoppingList.id, source: 'recipe' },
    })
    writeDebugLog(logLines)
    revalidatePath('/shopping-list')
    return
  }

  // Step 2: Normalise
  const items = await normaliseItems(aggregatedItems, logLines)

  // Step 3: Explicit mapping lookup
  await resolveExplicitMappings(items, logLines)

  // Step 4: Embedding match
  await matchByEmbedding(items, logLines)

  // Step 5: Cross-recipe dedup + Write
  await deduplicateAndWrite(items, weekStart, logLines)

  writeDebugLog(logLines)
  revalidatePath('/shopping-list')
}

// ─── Step 1: Collect + Aggregate ────────────────────────────────────────

async function collectAndAggregate(
  weekStart: Date,
  logLines: string[]
) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const mealPlans = await prisma.mealPlan.findMany({
    where: { date: { gte: weekStart, lt: weekEnd } },
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

  return aggregatedItems
}

// ─── Step 2: Normalise ──────────────────────────────────────────────────

async function normaliseItems(
  aggregatedItems: { name: string; sources: string[] }[],
  logLines: string[]
): Promise<NormalisedItem[]> {
  const items: NormalisedItem[] = await Promise.all(
    aggregatedItems.map(async (item) => {
      const { canonical } = await normaliseIngredientCached(item.name)
      return {
        name: item.name,
        canonicalName: canonical || item.name.toLowerCase(),
        sources: item.sources,
        resolved: false,
        matchConfidence: 'unmatched' as const,
        masterItemId: null,
      }
    })
  )

  logLines.push(
    '=== STEP 2: NORMALISE ===',
    ...items.map((item) => `  "${item.name}" → "${item.canonicalName}"`),
    '',
  )

  return items
}

// ─── Step 3: Explicit Mapping Lookup ────────────────────────────────────

async function resolveExplicitMappings(
  items: NormalisedItem[],
  logLines: string[]
) {
  try {
    const recipeNames = items.filter((i) => !i.resolved).map((i) => i.name.toLowerCase())
    if (recipeNames.length === 0) {
      logLines.push('=== STEP 3: EXPLICIT MAPPING LOOKUP ===', '  (no items to check)', '')
      return
    }

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

        // Increment confirmedCount — log warning on failure instead of silently swallowing
        prisma.ingredientMapping.update({
          where: { id: mapping.id },
          data: { confirmedCount: { increment: 1 } },
        }).catch((err) => console.warn('Failed to increment confirmedCount:', err))
      }
    }

    const remaining = items.filter((i) => !i.resolved).length
    logLines.push(
      `  Resolved: ${explicitCount}/${items.length}, remaining: ${remaining}`,
      '',
    )
  } catch (error) {
    logLines.push('=== STEP 3: EXPLICIT MAPPING LOOKUP ===', `  (error: ${error})`, '')
  }
}

// ─── Step 4: Embedding Match ────────────────────────────────────────────

async function matchByEmbedding(
  items: NormalisedItem[],
  logLines: string[]
) {
  try {
    const unresolvedItems = items.filter((i) => !i.resolved)

    if (unresolvedItems.length === 0) {
      logLines.push('=== STEP 4: EMBEDDING MATCH ===', '  (all items already resolved)', '')
      return
    }

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

    if (masterItems.length === 0) {
      logLines.push('  (no master list items with canonicalName + embeddings)', '')
      return
    }

    const textsToEmbed = unresolvedItems.map((i) => i.canonicalName)
    const ingredientEmbeddings = await computeEmbeddings(textsToEmbed)

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
  } catch (error) {
    console.error('Embedding matching failed, keeping unmatched items:', error)
    logLines.push('=== STEP 4: EMBEDDING MATCH ===', `  (error: ${error})`, '')
  }
}

// ─── Step 5: Cross-Recipe Dedup + Write ─────────────────────────────────

async function deduplicateAndWrite(
  items: NormalisedItem[],
  weekStart: Date,
  logLines: string[]
) {
  const unresolvedItems = items.filter((i) => !i.resolved)
  const dedupMap = new Map<string, NormalisedItem>()

  for (const item of unresolvedItems) {
    const existing = dedupMap.get(item.canonicalName)
    if (existing) {
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

  const shoppingList = await ensureShoppingListExists(weekStart)

  await prisma.shoppingListItem.deleteMany({
    where: { shoppingListId: shoppingList.id, source: 'recipe' },
  })

  if (shoppingListData.length > 0) {
    await prisma.shoppingListItem.createMany({
      data: shoppingListData.map((item) => ({ ...item, shoppingListId: shoppingList.id })),
    })
  }
}

// ─── Debug Logging ──────────────────────────────────────────────────────

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
