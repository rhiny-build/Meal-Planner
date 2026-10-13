/** Browser-side calls to the three admin backfill endpoints. One recipe per call. */

import type { ApplyStepResult, BackfillRecipeRef, PlanStepResult } from '@/lib/agents/recipeBackfill/adminSteps'
import type { ReportEntry } from '@/lib/agents/recipeBackfill/types'

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok && !data?.status) throw new Error(data?.error ?? `Request failed (${response.status})`)
  return data as T
}

export async function fetchBackfillRecipes(): Promise<BackfillRecipeRef[]> {
  const response = await fetch('/api/admin/backfill/recipes', { cache: 'no-store' })
  if (!response.ok) throw new Error(`Could not list the recipes (${response.status})`)
  return (await response.json()).recipes
}

export const requestRecipePlan = (recipeId: string) => postJson<PlanStepResult>('/api/admin/backfill/plan', { recipeId })

export const requestEntryApply = (entry: ReportEntry) => postJson<ApplyStepResult>('/api/admin/backfill/apply', { entry })
