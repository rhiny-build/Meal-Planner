/** Which report rows can be ticked, and which start ticked. Pure, so it is unit tested. */

import type { ReportEntry } from '@/lib/agents/recipeBackfill/types'

export type RowApplyState = { status: 'applied' | 'nothing-to-do' | 'skipped' | 'failed'; detail: string }

/** "leave" rows have nothing to apply, so they get no tick box. */
export function isTickable(entry: ReportEntry): boolean {
  return entry.action !== 'leave'
}

/** Enrich and quick start ticked. Duplicate merges are deleted-recipe changes, so they need an explicit tick. */
export function isTickedByDefault(entry: ReportEntry): boolean {
  return entry.action === 'enrich' || entry.action === 'quick'
}

/** Ticked rows still to apply: a row that is already done is not sent again. */
export function listRowsToApply(
  entries: ReportEntry[],
  ticked: Record<string, boolean>,
  applied: Record<string, RowApplyState>
): ReportEntry[] {
  return entries.filter((entry) => {
    const outcome = applied[entry.recipeId]?.status
    return isTickable(entry) && ticked[entry.recipeId] === true && outcome !== 'applied' && outcome !== 'nothing-to-do'
  })
}

export function formatCostUsd(costUsd: number): string {
  return costUsd < 0.01 ? `$${costUsd.toFixed(4)}` : `$${costUsd.toFixed(2)}`
}
