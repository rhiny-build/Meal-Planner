/**
 * Shared shapes for the one-off recipe backfill (S07).
 * The report is plain JSON: Ronen can open it, delete the entries he does not want, and hand it to --apply.
 */

export type BackfillAction = 'enrich' | 'quick' | 'leave' | 'duplicate'

/** What the backfill knows about one recipe in the book. */
export interface RecipeSnapshot {
  id: string
  name: string
  kind: string
  recipeUrl: string | null
  servings: number | null
  totalTimeMinutes: number | null
  description: string | null
  notes: string | null
  prepTime: string | null
  stepCount: number
  createdAt: Date
  ingredients: { id: string; name: string; quantity: string | null; unit: string | null; notes: string | null }[]
  /** How many MealPlan slots point at this recipe (all four slot columns) */
  mealPlanRefs: { lunch: number; protein: number; carb: number; vegetable: number }
}

/** Fields the page would fill. Only ever applied to fields that are empty at apply time. */
export interface EnrichChanges {
  servings?: number
  totalTimeMinutes?: number
  prepTime?: 'quick' | 'medium' | 'long'
  description?: string
  notes?: string
  /** Step text uses {ing:<existing ingredient id>} tokens; applied only when the recipe has no steps */
  steps?: { text: string; timerSeconds: number | null }[]
}

export interface MergeProposal {
  /** The recipe that stays */
  keeperId: string
  keeperName: string
  /** MealPlan slots that point at THIS (duplicate) recipe and would be re-pointed to the keeper */
  repoint: { lunch: number; protein: number; carb: number; vegetable: number }
  /** Things only the duplicate has (would be lost on delete). Empty = nothing is lost. */
  warnings: string[]
}

export interface ReportEntry {
  recipeId: string
  /** Checked at apply time: if the recipe was renamed since the report, the entry is skipped */
  name: string
  action: BackfillAction
  /** One plain sentence: why this action, or why "leave" */
  reason: string
  /** Human-readable summary of what would change */
  summary: string
  /** The agent run that produced this proposal (see /agent-runs); absent when no agent was needed */
  runId?: string
  sourceUrl?: string | null
  /** action = enrich */
  changes?: EnrichChanges
  /** action = duplicate. Not applied unless "approved" is set to true by hand. */
  merge?: MergeProposal
  approved?: boolean
  /** Set on every member of a duplicate group (keeper included) */
  duplicateGroup?: string
}

export interface TokenTotals {
  inputTokens: number
  outputTokens: number
  runs: number
}

export interface BackfillReport {
  version: 1
  generatedAt: string
  /** Database the plan was made against, without credentials (host/name) */
  database: string
  /** Free text shown at the top of the markdown, e.g. "SYNTHETIC LOCAL DATA" */
  note: string | null
  model: string
  recipesInBook: number
  tokens: TokenTotals
  /** Set when the token budget stopped the run early; the remaining recipes are listed as "leave" */
  budgetExceeded: boolean
  summary: Record<BackfillAction, number>
  entries: ReportEntry[]
}
