/**
 * The admin page's backfill, one recipe per call (Vercel cuts a request off after about a minute,
 * so the page drives the book one recipe at a time). Thin wrappers over the S07 code:
 * planRecipe decides, applyEntry applies. Nothing here decides anything itself.
 */

import type { PrismaClient } from '@prisma/client'
import { AI_CONFIG } from '@/lib/ai/config'
import { estimateTokenCostUsd, type TokenUsage } from '@/lib/ai/pricing'
import { runRecipeImporter } from '@/lib/agents/recipeImporter'
import { applyEntry, type ApplyResult } from './apply'
import { findDuplicateGroups } from './classify'
import { loadSnapshots, planRecipe, type PlanDeps } from './plan'
import type { ReportEntry, TokenTotals } from './types'

export type BackfillRecipeRef = { id: string; name: string }

export type PlanStepResult = {
  entry: ReportEntry
  /** Tokens this one recipe used (all zero when no agent was needed) */
  usage: TokenUsage
  estimatedCostUsd: number | null
}

export type ApplyStepResult = Pick<ApplyResult, 'status' | 'detail'>

const NO_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 }

/** The recipes the page walks through, in the same order as the S07 script. */
export async function listBackfillRecipes(prisma: PrismaClient): Promise<BackfillRecipeRef[]> {
  const snapshots = await loadSnapshots(prisma)
  return snapshots.map((recipe) => ({ id: recipe.id, name: recipe.name }))
}

const defaultImporter: PlanDeps['runImporter'] = (url, enrich) => runRecipeImporter({ url }, 'batch', { enrich })

export async function planBackfillRecipe(
  prisma: PrismaClient,
  recipeId: string,
  runImporter: PlanDeps['runImporter'] = defaultImporter
): Promise<PlanStepResult | null> {
  // The whole book is loaded because duplicate detection compares recipes with each other.
  const snapshots = await loadSnapshots(prisma)
  const recipe = snapshots.find((snapshot) => snapshot.id === recipeId)
  if (!recipe) return null
  const group = findDuplicateGroups(snapshots).find((candidate) =>
    [candidate.keeper, ...candidate.duplicates].some((member) => member.id === recipeId)
  )

  let usage = NO_USAGE
  const tokens: TokenTotals = { inputTokens: 0, outputTokens: 0, runs: 0 }
  const readRunUsage = async (runId: string) => {
    const run = await prisma.agentRun.findUnique({
      where: { id: runId },
      select: { inputTokens: true, outputTokens: true, cacheReadTokens: true, cacheCreationTokens: true },
    })
    usage = run ?? NO_USAGE
    return { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens }
  }

  const entry = await planRecipe(recipe, group, { runImporter, runTokens: readRunUsage }, tokens)
  if (group) entry.duplicateGroup = group.key
  return { entry, usage, estimatedCostUsd: estimateTokenCostUsd(AI_CONFIG.recipeImporter.model, usage) }
}

/**
 * Apply one ticked row. The page only sends ticked rows, so a duplicate sent here counts as approved
 * (merges are unticked by default and need an explicit tick). Safe to repeat: S07's applyEntry only fills empty
 * fields, and a merge or quick change that already happened reports "nothing-to-do".
 */
export async function applyBackfillEntry(prisma: PrismaClient, entry: ReportEntry): Promise<ApplyStepResult> {
  try {
    return await applyEntry(prisma, { ...entry, approved: entry.action === 'duplicate' ? true : entry.approved })
  } catch (error) {
    return { status: 'failed', detail: error instanceof Error ? error.message : String(error) }
  }
}
