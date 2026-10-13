/**
 * The apply step: carry out the entries Ronen kept in the report JSON.
 *
 * Safety, in order:
 *   1. The CLI refuses to get here without --i-have-a-backup (see scripts/rehaul/backfillRecipes.ts).
 *   2. Only entries still in the file are applied (he deletes what he does not want).
 *   3. Every entry is checked against the database NOW: the recipe must exist and still have the same name,
 *      and fields are only written when they are still empty. Re-running therefore changes nothing.
 *   4. Duplicate merges also need "approved": true on the entry, set by hand.
 *   5. Each recipe is applied in its own transaction: a failure on one leaves the others done and that one untouched.
 */

import type { PrismaClient } from '@prisma/client'
import { applyEnrichment } from './enrich'
import type { BackfillReport, ReportEntry } from './types'

export type ApplyStatus = 'applied' | 'nothing-to-do' | 'skipped' | 'failed'

export interface ApplyResult {
  recipeId: string
  name: string
  action: string
  status: ApplyStatus
  detail: string
}

export function parseReport(raw: unknown): BackfillReport {
  const report = raw as BackfillReport
  if (!report || report.version !== 1 || !Array.isArray(report.entries)) {
    throw new Error('This is not a backfill report (expected version 1 with an "entries" list)')
  }
  return report
}

export async function applyReport(prisma: PrismaClient, report: BackfillReport): Promise<ApplyResult[]> {
  const results: ApplyResult[] = []
  for (const entry of report.entries) {
    let outcome: Omit<ApplyResult, 'recipeId' | 'name' | 'action'>
    try {
      outcome = await applyEntry(prisma, entry)
    } catch (e) {
      outcome = { status: 'failed', detail: e instanceof Error ? e.message : String(e) }
    }
    results.push({ recipeId: entry.recipeId, name: entry.name, action: entry.action, ...outcome })
  }
  return results
}

export async function applyEntry(prisma: PrismaClient, entry: ReportEntry): Promise<Omit<ApplyResult, 'recipeId' | 'name' | 'action'>> {
  if (entry.action === 'leave') return { status: 'nothing-to-do', detail: 'left alone' }

  const recipe = await prisma.recipe.findUnique({
    where: { id: entry.recipeId },
    select: { id: true, name: true, kind: true, _count: { select: { steps: true } } },
  })

  if (entry.action === 'duplicate') {
    if (!recipe) return { status: 'nothing-to-do', detail: 'already merged (recipe no longer exists)' }
    if (entry.approved !== true) return { status: 'skipped', detail: 'merge not approved (set "approved": true to merge)' }
    return mergeDuplicate(prisma, entry, recipe.name)
  }

  if (!recipe) return { status: 'skipped', detail: 'recipe no longer exists' }
  if (recipe.name !== entry.name) return { status: 'skipped', detail: `recipe was renamed to "${recipe.name}" since the report` }

  if (entry.action === 'quick') {
    if (recipe.kind === 'quick') return { status: 'nothing-to-do', detail: 'already quick' }
    if (recipe._count.steps > 0) return { status: 'skipped', detail: 'recipe has a method now; not marking it quick' }
    await prisma.recipe.update({ where: { id: recipe.id }, data: { kind: 'quick' } })
    return { status: 'applied', detail: 'kind set to quick' }
  }

  if (entry.action === 'enrich') {
    if (!entry.changes) return { status: 'skipped', detail: 'entry has no changes' }
    const outcome = await prisma.$transaction((tx) => applyEnrichment(tx, recipe.id, entry.changes!))
    if (outcome.applied.length > 0) {
      return { status: 'applied', detail: `filled ${outcome.applied.join(', ')}${outcome.skipped.length ? ` (kept: ${outcome.skipped.join('; ')})` : ''}` }
    }
    return { status: 'nothing-to-do', detail: outcome.skipped.join('; ') || 'nothing to add' }
  }

  return { status: 'skipped', detail: `unknown action "${entry.action}"` }
}

/**
 * Merge a duplicate into the recipe that stays.
 * MealPlan rows point at recipe ids with ON DELETE CASCADE, so deleting the copy first would delete
 * whole meal-plan days. The order matters: re-point every slot, check none is left, then delete.
 */
async function mergeDuplicate(prisma: PrismaClient, entry: ReportEntry, name: string) {
  const merge = entry.merge
  if (!merge?.keeperId) return { status: 'skipped' as const, detail: 'entry has no keeper' }
  if (merge.keeperId === entry.recipeId) return { status: 'skipped' as const, detail: 'keeper and duplicate are the same recipe' }
  if (name !== entry.name) return { status: 'skipped' as const, detail: `recipe was renamed to "${name}" since the report` }

  return prisma.$transaction(async (tx) => {
    const keeper = await tx.recipe.findUnique({ where: { id: merge.keeperId }, select: { id: true } })
    if (!keeper) return { status: 'skipped' as const, detail: 'the recipe to keep no longer exists; not deleting anything' }

    const from = entry.recipeId
    const to = merge.keeperId
    const moved =
      (await tx.mealPlan.updateMany({ where: { lunchRecipeId: from }, data: { lunchRecipeId: to } })).count +
      (await tx.mealPlan.updateMany({ where: { proteinRecipeId: from }, data: { proteinRecipeId: to } })).count +
      (await tx.mealPlan.updateMany({ where: { carbRecipeId: from }, data: { carbRecipeId: to } })).count +
      (await tx.mealPlan.updateMany({ where: { vegetableRecipeId: from }, data: { vegetableRecipeId: to } })).count

    const left = await tx.mealPlan.count({
      where: { OR: [{ lunchRecipeId: from }, { proteinRecipeId: from }, { carbRecipeId: from }, { vegetableRecipeId: from }] },
    })
    if (left > 0) throw new Error(`${left} meal-plan rows still point at the copy; not deleting it`)

    await tx.recipe.delete({ where: { id: from } })
    return { status: 'applied' as const, detail: `re-pointed ${moved} meal-plan slot(s) to "${merge.keeperName}", deleted the copy` }
  })
}
