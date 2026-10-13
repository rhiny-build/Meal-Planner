/**
 * Align the model's meal plan with the plan we asked about.
 *
 * The model answers with one entry per day, labelled by date. We cannot trust the label
 * (it may be echoed in another format, shifted by a day, or missing), nor the recipe ids
 * (a name, a made-up id, or a recipe that does not fit the slot). So we rebuild the answer
 * in the shape the client needs: exactly one entry per day we sent, dated with the exact
 * "YYYY-MM-DD" we sent, with every id checked against the recipe book and its slot.
 */

import type { Recipe } from '@prisma/client'

export type PlanSlot = 'lunch' | 'protein' | 'carb' | 'vegetable'

export interface AlignedDay {
  date: string // "YYYY-MM-DD", as sent
  dayOfWeek: string
  lunchRecipeId: string
  proteinRecipeId: string
  carbRecipeId: string
  vegetableRecipeId: string
}

export interface ModelDay {
  date?: string
  lunchRecipeId?: string | null
  proteinRecipeId?: string | null
  carbRecipeId?: string | null
  vegetableRecipeId?: string | null
}

const SLOT_FITS: Record<PlanSlot, (r: Recipe) => boolean> = {
  lunch: (r) => r.isLunchAppropriate,
  protein: (r) => !!r.proteinType,
  carb: (r) => !!r.carbType,
  vegetable: (r) => !!r.vegetableType,
}

/** "2026-10-12", "2026-10-12T00:00:00.000Z", "Mon 2026-10-12" -> "2026-10-12"; anything else -> null. */
export function dateKey(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null
}

export function alignModifiedPlan(
  sent: { date: string; dayOfWeek: string }[],
  fromModel: ModelDay[],
  recipes: Recipe[]
): AlignedDay[] {
  const byId = new Map(recipes.map((r) => [r.id, r]))
  const valid = (slot: PlanSlot, id: string | null | undefined): string => {
    const recipe = id ? byId.get(id) : undefined
    return recipe && SLOT_FITS[slot](recipe) ? recipe.id : ''
  }
  // Every day found by its date: match by date. Otherwise (labels shifted or garbled) but the same
  // number of days came back in the order we listed them: trust the order, never a shifted label.
  const allDatesFound = sent.every((s) => fromModel.some((m) => dateKey(m.date) === s.date))
  const positional = !allDatesFound && fromModel.length === sent.length

  return sent.map((day, index) => {
    const m = positional ? fromModel[index] : fromModel.find((x) => dateKey(x.date) === day.date)
    return {
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      lunchRecipeId: valid('lunch', m?.lunchRecipeId),
      proteinRecipeId: valid('protein', m?.proteinRecipeId),
      carbRecipeId: valid('carb', m?.carbRecipeId),
      vegetableRecipeId: valid('vegetable', m?.vegetableRecipeId),
    }
  })
}
