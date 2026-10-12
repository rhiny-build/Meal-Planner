/**
 * Shared input handling for the MCP recipe tools (create_recipe, update_recipe).
 *
 * Claude submits ingredients as a list and steps that point into that list by
 * position ("{ing:1}" = first ingredient). The database wants real ids, so
 * after the ingredients exist we rewrite those positions into {ing:<id>}
 * tokens (the format from lib/recipeStepTokens.ts).
 */
import { z } from 'zod'
import { parseAmount } from '@/lib/ingredientAmount'
import { formatAmount, validateStepText } from '@/lib/recipeStepTokens'

export const RECIPE_KINDS = ['full', 'quick'] as const

export const ingredientInputSchema = z.object({
  name: z.string().min(1).describe('Ingredient name only, e.g. "plain flour" (no amount, no preparation)'),
  amount: z
    .number()
    .positive()
    .optional()
    .describe('Numeric amount, e.g. 300 or 1.5. Used to scale servings. Omit when there is no sensible number ("a pinch", "to taste").'),
  unit: z.string().optional().describe('Unit for the amount, e.g. "g", "ml", "tbsp", "cloves". Omit for countable things like eggs.'),
  quantity: z
    .string()
    .optional()
    .describe('Free-text quantity as written, e.g. "2 cups" or "a pinch". Optional when amount is given. Legacy field: prefer amount and unit.'),
  notes: z.string().optional().describe('Preparation or other notes, e.g. "finely chopped", "optional"'),
})

export const stepInputSchema = z.object({
  text: z
    .string()
    .min(1)
    .describe(
      'One instruction. To show an ingredient with its (scalable) amount, write {ing:N} where N is the ingredient\'s 1-based position in the ingredients list, e.g. "Sift {ing:1} into a bowl". Do not write amounts for referenced ingredients yourself.'
    ),
  timerSeconds: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Seconds to time for this step, if it has a wait (e.g. 600 for "simmer 10 minutes")'),
})

export type IngredientInput = z.infer<typeof ingredientInputSchema>
export type StepInput = z.infer<typeof stepInputSchema>

export interface IngredientRow {
  name: string
  quantity: string | null
  unit: string | null
  amount: number | null
  notes: string | null
  order: number
}

/** Build the DB row for one submitted ingredient, populating the numeric amount. */
export function toIngredientRow(input: IngredientInput, order: number): IngredientRow {
  const unit = input.unit?.trim() || null
  let quantity = input.quantity?.trim() || null
  let amount: number | null = null

  if (typeof input.amount === 'number') {
    amount = input.amount
    if (!quantity) quantity = formatAmount(input.amount)
  } else {
    amount = parseAmount(quantity, unit).amount
  }

  return { name: input.name.trim(), quantity, unit, amount, notes: input.notes?.trim() || null, order }
}

/** Legacy Recipe.ingredients text column: one "quantity unit name" line per ingredient. */
export function toLegacyIngredientText(rows: IngredientRow[]): string {
  return rows.map((r) => [r.quantity, r.unit, r.name].filter(Boolean).join(' ')).join('\n')
}

export type StepResolution =
  | { ok: true; steps: Array<{ order: number; text: string; timerSeconds: number | null }> }
  | { ok: false; error: string }

/**
 * Turn the submitted steps into DB steps. `ingredientIds` are the ids of the
 * recipe's final ingredients in list order. A purely numeric reference
 * ({ing:2}) is a 1-based position; any other id must be one of `ingredientIds`
 * (cuids are never purely numeric, so the two cannot clash).
 */
export function resolveSteps(steps: StepInput[], ingredientIds: string[]): StepResolution {
  const out: Array<{ order: number; text: string; timerSeconds: number | null }> = []

  for (let i = 0; i < steps.length; i++) {
    const label = `Step ${i + 1}`
    let positionError: string | null = null

    const text = steps[i].text.replace(/\{ing:(\d+)\}/g, (match, digits: string) => {
      const position = Number(digits)
      if (position < 1 || position > ingredientIds.length) {
        positionError ??= `${label} refers to ingredient {ing:${digits}} but the recipe has ${ingredientIds.length} ingredient(s). Positions start at 1.`
        return match
      }
      return `{ing:${ingredientIds[position - 1]}}`
    })
    if (positionError) return { ok: false, error: positionError }

    const check = validateStepText(text, ingredientIds)
    if (!check.valid) {
      const problems = [
        ...check.unknownIds.map((id) => `unknown ingredient id "${id}"`),
        ...check.malformed.map((frag) => `malformed reference "${frag}"`),
      ]
      return {
        ok: false,
        error: `${label} has a bad ingredient reference: ${problems.join(', ')}. Use {ing:N} with N the ingredient's position (starting at 1).`,
      }
    }

    out.push({ order: i, text, timerSeconds: steps[i].timerSeconds ?? null })
  }

  return { ok: true, steps: out }
}

/** Tool result helpers. Errors are returned, never thrown. */
export function jsonResult(payload: unknown, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    ...(isError ? { isError: true } : {}),
  }
}

export function errorResult(err: unknown) {
  return jsonResult({ success: false, error: err instanceof Error ? err.message : String(err) }, true)
}

/**
 * When ingredients are replaced but the existing method is kept, the old
 * {ing:<oldId>} tokens would dangle. Re-point each one at the new ingredient
 * with the same name; if there is none, fall back to the plain ingredient name
 * so the step still reads correctly.
 */
export function remapStepTokens(
  text: string,
  oldNamesById: Map<string, string>,
  newIdsByName: Map<string, string>
): string {
  return text.replace(/\{ing:([A-Za-z0-9_-]+)\}/g, (match, oldId: string) => {
    const oldName = oldNamesById.get(oldId)
    if (!oldName) return match
    const newId = newIdsByName.get(oldName.trim().toLowerCase())
    return newId ? `{ing:${newId}}` : oldName
  })
}
