/**
 * The dry run: decide, for every recipe in the book, what the backfill would do. Writes NOTHING to
 * recipes, ingredients, steps or meal plans. (The only rows it adds are AgentRun/AgentStep, because
 * every agent run is logged so it shows on /agent-runs.)
 *
 *   duplicate (not the keeper)  -> action duplicate, propose a merge          (no AI)
 *   has a source URL            -> run the importer in enrich mode            (AI, trigger "batch")
 *   looks like a quick item     -> action quick                               (no AI)
 *   anything else               -> leave (family recipe, captured later)      (no AI)
 */

import type { PrismaClient } from '@prisma/client'
import type { AgentResult } from '@/lib/agents/loop'
import type { EnrichContext } from '@/lib/agents/recipeImporter/enrichPrompt'
import type { ImportResult } from '@/lib/agents/recipeImporter/types'
import { findDuplicateGroups, mergeWarnings, quickReason, type DuplicateGroup } from './classify'
import { describeChanges, hasChanges, planEnrichment } from './enrich'
import type { BackfillAction, BackfillReport, RecipeSnapshot, ReportEntry, TokenTotals } from './types'

export async function loadSnapshots(prisma: PrismaClient): Promise<RecipeSnapshot[]> {
  const [recipes, plans] = await Promise.all([
    prisma.recipe.findMany({
      orderBy: [{ name: 'asc' }, { createdAt: 'asc' }],
      include: {
        structuredIngredients: { orderBy: { order: 'asc' } },
        _count: { select: { steps: true } },
      },
    }),
    prisma.mealPlan.findMany({
      select: { lunchRecipeId: true, proteinRecipeId: true, carbRecipeId: true, vegetableRecipeId: true },
    }),
  ])

  const refs = new Map<string, RecipeSnapshot['mealPlanRefs']>()
  const bump = (id: string | null, slot: keyof RecipeSnapshot['mealPlanRefs']) => {
    if (!id) return
    const row = refs.get(id) ?? { lunch: 0, protein: 0, carb: 0, vegetable: 0 }
    row[slot]++
    refs.set(id, row)
  }
  for (const p of plans) {
    bump(p.lunchRecipeId, 'lunch')
    bump(p.proteinRecipeId, 'protein')
    bump(p.carbRecipeId, 'carb')
    bump(p.vegetableRecipeId, 'vegetable')
  }

  return recipes.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    recipeUrl: r.recipeUrl,
    servings: r.servings,
    totalTimeMinutes: r.totalTimeMinutes,
    description: r.description,
    notes: r.notes,
    prepTime: r.prepTime,
    stepCount: r._count.steps,
    createdAt: r.createdAt,
    ingredients: r.structuredIngredients.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      notes: i.notes,
    })),
    mealPlanRefs: refs.get(r.id) ?? { lunch: 0, protein: 0, carb: 0, vegetable: 0 },
  }))
}

export function toEnrichContext(r: RecipeSnapshot): EnrichContext {
  return {
    recipeId: r.id,
    name: r.name,
    servings: r.servings,
    totalTimeMinutes: r.totalTimeMinutes,
    description: r.description,
    notes: r.notes,
    hasSteps: r.stepCount > 0,
    ingredients: r.ingredients,
  }
}

export interface PlanDeps {
  /** Runs the importer in enrich mode for one recipe (trigger "batch"). Injected so tests need no model. */
  runImporter: (url: string, context: EnrichContext) => Promise<AgentResult<ImportResult>>
  /** Token totals of a finished run, from the run log */
  runTokens: (runId: string) => Promise<{ inputTokens: number; outputTokens: number }>
  sleep: (ms: number) => Promise<void>
  /** Pause between agent runs, so recipe sites and the API are not hammered */
  delayMs: number
  /** Stop starting new agent runs once this many tokens (input + output) have been used */
  tokenBudget: number
  /** Called after every recipe with the entry just made (the CLI prints it and saves progress) */
  onEntry?: (entry: ReportEntry, done: number, total: number) => void | Promise<void>
}

export interface PlanOptions {
  database: string
  note: string | null
  model: string
  /** Only plan recipes whose name contains this text (for trying a few) */
  only?: string
  limit?: number
}

const EMPTY_SUMMARY = (): Record<BackfillAction, number> => ({ enrich: 0, quick: 0, leave: 0, duplicate: 0 })

function isWebUrl(url: string): boolean {
  return /^https?:\/\/\S+$/i.test(url.trim())
}

export async function buildBackfillPlan(
  prisma: PrismaClient,
  deps: PlanDeps,
  options: PlanOptions
): Promise<BackfillReport> {
  const all = await loadSnapshots(prisma)
  const groups = findDuplicateGroups(all)
  const groupOf = new Map<string, DuplicateGroup>()
  groups.forEach((g) => [g.keeper, ...g.duplicates].forEach((r) => groupOf.set(r.id, g)))

  let targets = all
  if (options.only) targets = targets.filter((r) => r.name.toLowerCase().includes(options.only!.toLowerCase()))
  if (options.limit) targets = targets.slice(0, options.limit)

  const entries: ReportEntry[] = []
  const tokens = { inputTokens: 0, outputTokens: 0, runs: 0 }
  let budgetExceeded = false
  let ranAgent = false

  for (const [index, recipe] of targets.entries()) {
    const group = groupOf.get(recipe.id)
    let entry: ReportEntry

    if (needsAgent(recipe, group)) {
      if (tokens.inputTokens + tokens.outputTokens >= deps.tokenBudget) {
        budgetExceeded = true
        entry = leave(recipe, `Not checked: the token budget (${deps.tokenBudget}) was used up. Re-run with a larger --token-budget`)
      } else {
        if (ranAgent) await deps.sleep(deps.delayMs)
        ranAgent = true
        entry = await planRecipe(recipe, group, deps, tokens)
      }
    } else {
      entry = await planRecipe(recipe, group, deps, tokens)
    }

    if (group) entry.duplicateGroup = group.key
    entries.push(entry)
    await deps.onEntry?.(entry, index + 1, targets.length)
  }

  const summary = EMPTY_SUMMARY()
  entries.forEach((e) => summary[e.action]++)

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    database: options.database,
    note: options.note,
    model: options.model,
    recipesInBook: all.length,
    tokens,
    budgetExceeded,
    summary,
    entries,
  }
}

/** True when planning this recipe means running the importer agent (and so spending tokens). */
export function needsAgent(recipe: RecipeSnapshot, group: DuplicateGroup | undefined): boolean {
  const isDuplicateCopy = !!group && group.keeper.id !== recipe.id
  return !isDuplicateCopy && !!recipe.recipeUrl && isWebUrl(recipe.recipeUrl)
}

/**
 * Decide what the backfill would do for ONE recipe. The dry-run loop and the admin page's
 * one-recipe-per-request endpoint both call this, so they can never disagree.
 */
export async function planRecipe(
  recipe: RecipeSnapshot,
  group: DuplicateGroup | undefined,
  deps: Pick<PlanDeps, 'runImporter' | 'runTokens'>,
  tokens: TokenTotals
): Promise<ReportEntry> {
  if (group && group.keeper.id !== recipe.id) return duplicateEntry(recipe, group)
  if (recipe.recipeUrl) {
    if (!isWebUrl(recipe.recipeUrl)) return leave(recipe, 'The recipe link is not a web address, so nothing could be read')
    return enrichEntry(recipe, deps, tokens)
  }
  const quick = quickReason(recipe)
  if (!quick) return leave(recipe, 'Family recipe with no link. Captured later through Claude.ai or as you cook')
  return { recipeId: recipe.id, name: recipe.name, action: 'quick', reason: quick, summary: 'kind: full -> quick' }
}

function leave(recipe: RecipeSnapshot, reason: string, runId?: string): ReportEntry {
  return {
    recipeId: recipe.id,
    name: recipe.name,
    action: 'leave',
    reason,
    summary: 'no change',
    sourceUrl: recipe.recipeUrl,
    ...(runId ? { runId } : {}),
  }
}

function duplicateEntry(recipe: RecipeSnapshot, group: DuplicateGroup): ReportEntry {
  const refs = recipe.mealPlanRefs
  const total = refs.lunch + refs.protein + refs.carb + refs.vegetable
  const warnings = mergeWarnings(group.keeper, recipe)
  return {
    recipeId: recipe.id,
    name: recipe.name,
    action: 'duplicate',
    reason: `Same ${group.keeper.recipeUrl && group.keeper.recipeUrl === recipe.recipeUrl ? 'name and link' : 'name'} as "${group.keeper.name}" (${group.keeper.id}), which has more data`,
    summary:
      `merge into ${group.keeper.id}: re-point ${total} meal-plan slot${total === 1 ? '' : 's'}, then delete this copy` +
      (warnings.length ? `; would lose: ${warnings.join('; ')}` : ''),
    sourceUrl: recipe.recipeUrl,
    merge: { keeperId: group.keeper.id, keeperName: group.keeper.name, repoint: { ...refs }, warnings },
    approved: false,
  }
}

async function enrichEntry(
  recipe: RecipeSnapshot,
  deps: Pick<PlanDeps, 'runImporter' | 'runTokens'>,
  tokens: TokenTotals
): Promise<ReportEntry> {
  let result: AgentResult<ImportResult>
  try {
    result = await deps.runImporter(recipe.recipeUrl!, toEnrichContext(recipe))
  } catch (e) {
    return leave(recipe, `The agent could not run: ${e instanceof Error ? e.message : String(e)}`)
  }

  tokens.runs++
  const used = await deps.runTokens(result.runId).catch(() => ({ inputTokens: 0, outputTokens: 0 }))
  tokens.inputTokens += used.inputTokens
  tokens.outputTokens += used.outputTokens

  if (!result.ok || !result.output) {
    return leave(recipe, result.gaveUpReason ?? result.error ?? 'The agent finished without a recipe', result.runId)
  }

  const draft = result.output.draft
  const changes = planEnrichment(recipe, draft)
  const pageHasMethod = draft.steps.length > 0

  if (!hasChanges(changes)) {
    return leave(
      recipe,
      !pageHasMethod
        ? 'No method found on the page, and nothing else to add'
        : 'Page read, but the book already has everything the page gives',
      result.runId
    )
  }
  return {
    recipeId: recipe.id,
    name: recipe.name,
    action: 'enrich',
    reason: pageHasMethod || recipe.stepCount > 0 ? 'Source page read; filling empty fields only' : 'Source page read; no method found on the page, so no steps',
    summary: describeChanges(changes),
    runId: result.runId,
    sourceUrl: recipe.recipeUrl,
    changes,
  }
}
