/**
 * Recipe write helpers
 *
 * Shared by POST /api/recipes/create and PATCH /api/recipes/[id] so both go
 * through one path. Handles the recipe-book fields (kind, servings, notes,
 * method steps) and keeps ingredient ids stable across edits so that
 * {ing:<id>} tokens in step text keep pointing at the right ingredient.
 */

import type { PrismaClient, Prisma } from '@prisma/client'
import type { RecipeFormData, StructuredIngredientData, RecipeStepData } from '@/types'
import { parseIngredientLine } from '@/lib/ingredientParser'
import { parseAmount } from '@/lib/ingredientAmount'
import { validateStepText } from '@/lib/recipeStepTokens'

/** Thrown for bad input; routes turn it into a 400. */
export class RecipeValidationError extends Error {}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/
const KINDS = ['full', 'quick']

export interface PreparedIngredient {
  id?: string
  name: string
  quantity: string | null
  unit: string | null
  amount: number | null
  notes: string | null
  order: number
}

const blankToNull = (v: string | null | undefined): string | null => {
  const t = typeof v === 'string' ? v.trim() : ''
  return t === '' ? null : t
}

const intOrNull = (v: unknown, label: string, min: number): number | null => {
  if (v === undefined || v === null || v === '') return null
  const n = Number(v)
  if (!Number.isInteger(n) || n < min) {
    throw new RecipeValidationError(`${label} must be a whole number of at least ${min}`)
  }
  return n
}

/** Ingredient rows to write: from structured data if given, else parsed from the text lines. */
export function prepareIngredients(
  structured: StructuredIngredientData[] | undefined,
  text: string | undefined
): PreparedIngredient[] | undefined {
  let rows: StructuredIngredientData[] | undefined = structured
  if (!rows || rows.length === 0) {
    if (!text) return undefined
    rows = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line, index) => {
        const parsed = parseIngredientLine(line)
        return {
          name: parsed.name || line,
          quantity: parsed.quantity || null,
          unit: parsed.unit || null,
          notes: parsed.notes || null,
          order: index,
        }
      })
  }
  const seen = new Set<string>()
  return rows
    .filter((r) => r.name && r.name.trim())
    .map((r, index) => {
      if (r.id !== undefined) {
        if (!ID_RE.test(r.id)) throw new RecipeValidationError('Invalid ingredient id')
        if (seen.has(r.id)) throw new RecipeValidationError('Duplicate ingredient id')
        seen.add(r.id)
      }
      const quantity = blankToNull(r.quantity)
      const unit = blankToNull(r.unit)
      return {
        id: r.id,
        name: r.name.trim(),
        quantity,
        unit,
        amount: parseAmount(quantity, unit).amount,
        notes: blankToNull(r.notes),
        order: index,
      }
    })
}

/** Legacy `Recipe.ingredients` text, one line per ingredient. */
export function composeIngredientsText(rows: PreparedIngredient[]): string {
  return rows
    .map((i) =>
      [i.quantity, i.unit, i.name, i.notes ? `(${i.notes})` : null].filter(Boolean).join(' ')
    )
    .join('\n')
}

function prepareSteps(steps: RecipeStepData[], validIds: Set<string>) {
  const kept = steps.filter((s) => s.text && s.text.trim())
  return kept.map((s, order) => {
    const text = s.text.trim()
    const check = validateStepText(text, validIds)
    if (check.unknownIds.length > 0) {
      throw new RecipeValidationError(`Step ${order + 1} refers to an ingredient not in this recipe`)
    }
    return { order, text, timerSeconds: intOrNull(s.timerSeconds, 'Timer', 1) }
  })
}

interface BookFields {
  kind?: string
  servings?: number | null
  totalTimeMinutes?: number | null
  description?: string | null
  notes?: string | null
}

function bookFields(body: Partial<RecipeFormData>): BookFields {
  const data: BookFields = {}
  if (body.kind !== undefined) {
    if (!KINDS.includes(body.kind)) throw new RecipeValidationError('kind must be full or quick')
    data.kind = body.kind
  }
  if (body.servings !== undefined) data.servings = intOrNull(body.servings, 'Servings', 1)
  if (body.totalTimeMinutes !== undefined)
    data.totalTimeMinutes = intOrNull(body.totalTimeMinutes, 'Total time', 1)
  if (body.description !== undefined) data.description = blankToNull(body.description)
  if (body.notes !== undefined) data.notes = blankToNull(body.notes)
  return data
}

/**
 * Prisma's default interactive-transaction limit is 5 s. Against a remote pooled database each
 * query costs a network round trip (and a cold database adds more), so a recipe with many
 * ingredients could be cut off with "Transaction not found" and nothing was saved.
 */
export const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 30_000 }

const include = {
  structuredIngredients: { orderBy: { order: 'asc' } },
  steps: { orderBy: { order: 'asc' } },
} satisfies Prisma.RecipeInclude

export async function createRecipeFromForm(prisma: PrismaClient, body: RecipeFormData) {
  const rows = prepareIngredients(body.structuredIngredients, body.ingredients) ?? []
  const steps = prepareSteps(
    body.steps ?? [],
    new Set(rows.map((r) => r.id).filter(Boolean) as string[])
  )
  return prisma.recipe.create({
    data: {
      name: body.name,
      recipeUrl: body.recipeUrl || null,
      ingredients: body.ingredients || composeIngredientsText(rows),
      proteinType: body.proteinType || null,
      carbType: body.carbType || null,
      vegetableType: body.vegetableType || null,
      isLunchAppropriate: body.isLunchAppropriate || false,
      prepTime: body.prepTime || null,
      tier: body.tier || 'favorite',
      ...bookFields(body),
      structuredIngredients: { create: rows },
      steps: { create: steps },
    },
    include,
  })
}

export async function updateRecipeFromForm(
  prisma: PrismaClient,
  id: string,
  body: Partial<RecipeFormData>
) {
  const rows = prepareIngredients(body.structuredIngredients, body.ingredients)
  const {
    structuredIngredients: _structured,
    steps: stepsIn,
    kind: _kind,
    servings: _servings,
    totalTimeMinutes: _total,
    description: _description,
    notes: _notes,
    ...plain
  } = body
  const book = bookFields(body)

  return prisma.$transaction(async (tx) => {
    const existing = await tx.ingredient.findMany({
      where: { recipeId: id },
      select: { id: true, name: true, quantity: true, unit: true, amount: true, notes: true, order: true },
    })
    const existingById = new Map(existing.map((e) => [e.id, e]))
    const existingIds = new Set(existingById.keys())

    // Steps are validated against the ingredient ids the recipe will have after this save.
    let finalIds = existingIds
    if (rows) {
      finalIds = new Set<string>()
      for (const r of rows) if (r.id) finalIds.add(r.id)
    }
    const steps = stepsIn ? prepareSteps(stepsIn, finalIds) : undefined

    if (rows) {
      const keepIds = rows.filter((r) => r.id && existingIds.has(r.id)).map((r) => r.id as string)
      await tx.ingredient.deleteMany({ where: { recipeId: id, id: { notIn: keepIds } } })
      const toCreate: Prisma.IngredientCreateManyInput[] = []
      for (const r of rows) {
        const { id: rid, ...fields } = r
        const before = rid ? existingById.get(rid) : undefined
        if (before) {
          // Only touch rows that actually changed: each query is a network round trip, and the
          // whole save must fit in the transaction time limit on a remote database.
          const changed = (Object.keys(fields) as (keyof typeof fields)[]).some(
            (k) => before[k] !== fields[k]
          )
          if (changed) await tx.ingredient.update({ where: { id: rid }, data: fields })
        } else {
          toCreate.push({ ...fields, ...(rid ? { id: rid } : {}), recipeId: id })
        }
      }
      if (toCreate.length > 0) await tx.ingredient.createMany({ data: toCreate })
    }
    if (steps) {
      await tx.recipeStep.deleteMany({ where: { recipeId: id } })
      await tx.recipeStep.createMany({ data: steps.map((s) => ({ ...s, recipeId: id })) })
    }

    return tx.recipe.update({
      where: { id },
      data: {
        ...(plain as Prisma.RecipeUpdateInput),
        ...(rows && !plain.ingredients ? { ingredients: composeIngredientsText(rows) } : {}),
        ...book,
      },
      include,
    })
  }, TRANSACTION_OPTIONS)
}
