/**
 * Search the recipe book for the meal-plan agent (and for Claude.ai over MCP): by slot, kind, tier and name,
 * with when each recipe was last on the plan, so "not had it for 3 weeks" is something the agent can see.
 */

import type { PrismaClient, Recipe } from '@prisma/client'
import { formatDateParam, parseDateParam } from '@/lib/dateUtils'
import { addDays } from './dates'
import type { Slot } from './types'

export interface RecipeSearchParams {
  slot?: Slot
  kind?: 'full' | 'quick'
  tier?: 'favorite' | 'non-regular' | 'new'
  /** Words that must appear in the recipe name */
  query?: string
  /** Leave out recipes that were on the plan in the last N days before `asOf` */
  notOnPlanInLastDays?: number
  limit?: number
  /** YYYY-MM-DD the "last on plan" dates are measured from (default: today) */
  asOf?: string
}

/**
 * One search result. Kept short on purpose: every result is sent back to the model on each later turn of the run, so
 * empty fields are left out (null daysSinceOnPlan means "never on the plan").
 */
export interface RecipeHit {
  id: string
  name: string
  kind: string
  tier: string
  prepTime?: string
  totalTimeMinutes?: number
  /** What the recipe is: protein / carb / vegetable type, whichever are set */
  type: string
  /** Latest date the recipe was in any slot on or before asOf; absent if never */
  lastOnPlan?: string
  daysSinceOnPlan?: number
}

const DEFAULT_LIMIT = 12
const MAX_LIMIT = 30
const TIER_ORDER: Record<string, number> = { favorite: 0, 'non-regular': 1, new: 2 }

const fitsSlot = (r: Recipe, slot: Slot) =>
  r.kind === 'quick' ||
  (slot === 'lunch' && r.isLunchAppropriate) ||
  (slot === 'protein' && !!r.proteinType) ||
  (slot === 'carb' && !!r.carbType) ||
  (slot === 'vegetable' && !!r.vegetableType)

/** recipeId -> latest plan date (YYYY-MM-DD) on or before asOf, over every slot of every saved day. */
export async function lastOnPlanDates(prisma: PrismaClient, asOf: string): Promise<Map<string, string>> {
  const rows = await prisma.mealPlan.findMany({
    where: { date: { lt: parseDateParam(addDays(asOf, 1)) } },
    select: { date: true, lunchRecipeId: true, proteinRecipeId: true, carbRecipeId: true, vegetableRecipeId: true },
  })
  const latest = new Map<string, string>()
  for (const row of rows) {
    const key = formatDateParam(row.date)
    for (const id of [row.lunchRecipeId, row.proteinRecipeId, row.carbRecipeId, row.vegetableRecipeId]) {
      if (id && key > (latest.get(id) ?? '')) latest.set(id, key)
    }
  }
  return latest
}

const daysApart = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000)

export async function searchRecipes(prisma: PrismaClient, params: RecipeSearchParams, today: string): Promise<RecipeHit[]> {
  const asOf = params.asOf ?? today
  const [recipes, latest] = await Promise.all([prisma.recipe.findMany(), lastOnPlanDates(prisma, asOf)])
  const words = (params.query ?? '').toLowerCase().split(/\s+/).filter(Boolean)

  const hits = recipes
    .filter(r => !params.slot || fitsSlot(r, params.slot))
    .filter(r => !params.kind || r.kind === params.kind)
    .filter(r => !params.tier || r.tier === params.tier)
    .filter(r => words.every(w => r.name.toLowerCase().includes(w)))
    .map((r): RecipeHit => {
      const last = latest.get(r.id) ?? null
      return {
        id: r.id, name: r.name, kind: r.kind, tier: r.tier,
        ...(r.prepTime ? { prepTime: r.prepTime } : {}),
        ...(r.totalTimeMinutes ? { totalTimeMinutes: r.totalTimeMinutes } : {}),
        type: [r.proteinType, r.carbType, r.vegetableType].filter(Boolean).join('/'),
        ...(last ? { lastOnPlan: last, daysSinceOnPlan: daysApart(last, asOf) } : {}),
      }
    })
    .filter(h => params.notOnPlanInLastDays === undefined || h.daysSinceOnPlan === undefined || h.daysSinceOnPlan > params.notOnPlanInLastDays)

  // Never-planned first, then the longest since it was on the plan; favourites ahead of the rest on a tie
  hits.sort((a, b) => {
    const since = (h: RecipeHit) => h.daysSinceOnPlan ?? Infinity
    return since(b) - since(a) || (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9) || a.name.localeCompare(b.name)
  })
  return hits.slice(0, Math.min(params.limit ?? DEFAULT_LIMIT, MAX_LIMIT))
}
