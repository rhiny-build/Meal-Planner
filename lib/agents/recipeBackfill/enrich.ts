/**
 * Enrich = fill the gaps in an existing recipe from its source page, never overwrite.
 *
 * Two halves, deliberately separate:
 *   planEnrichment   (dry run)  compares the book's copy with the importer's draft and lists what
 *                               is MISSING. Pure; writes nothing.
 *   applyEnrichment  (apply)    re-reads the recipe and writes only the fields that are STILL empty.
 *                               That second check is what makes re-running safe.
 *
 * The model's draft is never trusted to decide what changes: the empty-field rule lives here, in code.
 */

import type { Prisma } from '@prisma/client'
import type { RecipeDraft } from '@/lib/agents/recipeImporter/types'
import { validateStepText } from '@/lib/recipeStepTokens'
import type { EnrichChanges, RecipeSnapshot } from './types'

const TOKEN = /\{ing:([A-Za-z0-9_-]+)\}/g

/**
 * Step text from the draft refers to draft keys. In enrich mode the model reuses the book's ingredient
 * ids as keys. Any token that does not point at a book ingredient becomes the plain ingredient name,
 * because we do not add ingredients to a recipe the family already wrote.
 */
export function rewriteStepTokens(text: string, draft: RecipeDraft, bookIngredientIds: Set<string>): string {
  const nameByKey = new Map(draft.ingredients.map((i) => [i.key, i.name]))
  return text.replace(TOKEN, (_whole, key: string) =>
    bookIngredientIds.has(key) ? `{ing:${key}}` : nameByKey.get(key) ?? 'the ingredient'
  )
}

export function planEnrichment(recipe: RecipeSnapshot, draft: RecipeDraft): EnrichChanges {
  const changes: EnrichChanges = {}
  if (recipe.servings === null && draft.servings !== null) changes.servings = draft.servings
  if (recipe.totalTimeMinutes === null && draft.totalTimeMinutes !== null) changes.totalTimeMinutes = draft.totalTimeMinutes
  if (!recipe.prepTime && draft.prepTime) changes.prepTime = draft.prepTime
  if (!recipe.description && draft.description) changes.description = draft.description
  if (!recipe.notes && draft.notes) changes.notes = draft.notes

  if (recipe.stepCount === 0 && draft.steps.length > 0) {
    const ids = new Set(recipe.ingredients.map((i) => i.id))
    changes.steps = draft.steps.map((s) => ({ text: rewriteStepTokens(s.text, draft, ids), timerSeconds: s.timerSeconds }))
  }
  return changes
}

/** Short human summary, e.g. "servings 4, total time 55 min, 5-step method". */
export function describeChanges(changes: EnrichChanges): string {
  const parts: string[] = []
  if (changes.servings !== undefined) parts.push(`servings ${changes.servings}`)
  if (changes.totalTimeMinutes !== undefined) parts.push(`total time ${changes.totalTimeMinutes} min`)
  if (changes.prepTime) parts.push(`prep bucket ${changes.prepTime}`)
  if (changes.description) parts.push('description')
  if (changes.notes) parts.push('notes')
  if (changes.steps) parts.push(`${changes.steps.length}-step method`)
  return parts.join(', ')
}

export function hasChanges(changes: EnrichChanges): boolean {
  return Object.keys(changes).length > 0
}

export interface ApplyOutcome {
  applied: string[]
  skipped: string[]
}

/**
 * Write the proposed changes into a recipe, but only into fields that are empty right now.
 * Re-running with the same changes finds nothing empty and writes nothing.
 */
export async function applyEnrichment(
  tx: Prisma.TransactionClient,
  recipeId: string,
  changes: EnrichChanges
): Promise<ApplyOutcome> {
  const recipe = await tx.recipe.findUnique({
    where: { id: recipeId },
    include: { structuredIngredients: { select: { id: true } }, _count: { select: { steps: true } } },
  })
  if (!recipe) return { applied: [], skipped: ['recipe no longer exists'] }

  const applied: string[] = []
  const skipped: string[] = []
  const data: Prisma.RecipeUpdateInput = {}

  const fill = <K extends 'servings' | 'totalTimeMinutes' | 'prepTime' | 'description' | 'notes'>(field: K, value: unknown) => {
    if (value === undefined || value === null || value === '') return
    if (recipe[field] !== null && recipe[field] !== '') {
      skipped.push(`${field} already set`)
      return
    }
    ;(data as Record<string, unknown>)[field] = value
    applied.push(field)
  }
  fill('servings', changes.servings)
  fill('totalTimeMinutes', changes.totalTimeMinutes)
  fill('prepTime', changes.prepTime)
  fill('description', changes.description)
  fill('notes', changes.notes)

  if (changes.steps && changes.steps.length > 0) {
    const ids = recipe.structuredIngredients.map((i) => i.id)
    if (recipe._count.steps > 0) {
      skipped.push('method already has steps')
    } else if (changes.steps.some((s) => !s.text?.trim() || !validateStepText(s.text, ids).valid)) {
      // A hand-edited report could point a step at an ingredient that is not in this recipe.
      skipped.push('method skipped: a step is empty or refers to an ingredient not in this recipe')
    } else {
      await tx.recipeStep.createMany({
        data: changes.steps.map((s, order) => ({
          recipeId,
          order,
          text: s.text,
          timerSeconds: typeof s.timerSeconds === 'number' && s.timerSeconds > 0 ? Math.round(s.timerSeconds) : null,
        })),
      })
      applied.push(`${changes.steps.length} steps`)
    }
  }

  if (Object.keys(data).length > 0) await tx.recipe.update({ where: { id: recipeId }, data })
  return { applied, skipped }
}
