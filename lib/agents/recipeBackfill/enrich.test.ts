import { describe, it, expect, vi } from 'vitest'
import { applyEnrichment, describeChanges, hasChanges, planEnrichment, rewriteStepTokens } from './enrich'
import type { RecipeDraft } from '@/lib/agents/recipeImporter/types'
import type { RecipeSnapshot } from './types'

const book: RecipeSnapshot = {
  id: 'rec1',
  name: 'Goulash',
  kind: 'full',
  recipeUrl: 'https://x.test/g',
  servings: null,
  totalTimeMinutes: null,
  description: null,
  notes: 'Ronen note',
  prepTime: null,
  stepCount: 0,
  createdAt: new Date(),
  ingredients: [
    { id: 'ingBeef', name: 'beef', quantity: '1', unit: 'kg', notes: null },
    { id: 'ingOnion', name: 'onion', quantity: null, unit: null, notes: null },
  ],
  mealPlanRefs: { lunch: 0, protein: 0, carb: 0, vegetable: 0 },
}

const draft: RecipeDraft = {
  name: 'Goulash',
  kind: 'full',
  description: 'A stew',
  servings: 6,
  totalTimeMinutes: 150,
  prepTime: 'long',
  sourceUrl: 'https://x.test/g',
  notes: 'Page note that must not replace Ronen note',
  ingredients: [
    { key: 'ingBeef', name: 'beef', quantity: '2', unit: 'kg', amount: 2, notes: null },
    { key: 'n1', name: 'paprika', quantity: '2', unit: 'tbsp', amount: 2, notes: null },
  ],
  steps: [
    { text: 'Brown {ing:ingBeef} with {ing:n1}.', timerSeconds: 600 },
    { text: 'Simmer 2 hours.', timerSeconds: 7200 },
  ],
  proteinType: null,
  carbType: null,
  includesVegetables: false,
}

describe('planEnrichment', () => {
  it('fills only empty fields and never touches fields that are set', () => {
    const changes = planEnrichment(book, draft)
    expect(changes).toMatchObject({ servings: 6, totalTimeMinutes: 150, prepTime: 'long', description: 'A stew' })
    expect(changes.notes).toBeUndefined() // Ronen already has notes
  })

  it('keeps tokens for book ingredients and turns unknown ones into plain names', () => {
    const changes = planEnrichment(book, draft)
    expect(changes.steps![0].text).toBe('Brown {ing:ingBeef} with paprika.')
    expect(changes.steps![0].timerSeconds).toBe(600)
  })

  it('does not propose steps when the recipe already has a method', () => {
    expect(planEnrichment({ ...book, stepCount: 3 }, draft).steps).toBeUndefined()
  })

  it('proposes nothing when the page gives nothing new', () => {
    const empty = planEnrichment(
      { ...book, servings: 4, totalTimeMinutes: 60, description: 'x', prepTime: 'long', stepCount: 2 },
      draft
    )
    expect(hasChanges(empty)).toBe(false)
  })

  it('never invents: an empty draft proposes nothing', () => {
    const none = planEnrichment(book, { ...draft, description: null, servings: null, totalTimeMinutes: null, prepTime: null, notes: null, steps: [] })
    expect(none).toEqual({})
  })

  it('describes changes in one line', () => {
    expect(describeChanges(planEnrichment(book, draft))).toBe('servings 6, total time 150 min, prep bucket long, description, 2-step method')
  })
})

describe('rewriteStepTokens', () => {
  it('uses the ingredient name for unknown keys, and a neutral phrase if the key is not in the draft either', () => {
    expect(rewriteStepTokens('Add {ing:zzz}.', draft, new Set())).toBe('Add the ingredient.')
  })
})

describe('applyEnrichment', () => {
  function fakeTx(recipe: Record<string, unknown> | null, ingredientIds = ['ingBeef'], steps = 0) {
    return {
      recipe: {
        findUnique: vi.fn().mockResolvedValue(
          recipe && { ...recipe, structuredIngredients: ingredientIds.map((id) => ({ id })), _count: { steps } }
        ),
        update: vi.fn(),
      },
      recipeStep: { createMany: vi.fn() },
    } as any
  }
  const empty = { servings: null, totalTimeMinutes: null, prepTime: null, description: null, notes: null }

  it('writes empty fields and steps', async () => {
    const tx = fakeTx(empty)
    const out = await applyEnrichment(tx, 'rec1', { servings: 4, steps: [{ text: 'Fry {ing:ingBeef}', timerSeconds: 60 }] })
    expect(out.applied).toEqual(['servings', '1 steps'])
    expect(tx.recipe.update).toHaveBeenCalledWith({ where: { id: 'rec1' }, data: { servings: 4 } })
    expect(tx.recipeStep.createMany).toHaveBeenCalledOnce()
  })

  it('writes nothing when everything is already set (idempotent re-run)', async () => {
    const tx = fakeTx({ servings: 4, totalTimeMinutes: 30, prepTime: 'quick', description: 'd', notes: 'n' }, ['ingBeef'], 2)
    const out = await applyEnrichment(tx, 'rec1', {
      servings: 6, totalTimeMinutes: 60, prepTime: 'long', description: 'x', notes: 'y',
      steps: [{ text: 'Fry', timerSeconds: null }],
    })
    expect(out.applied).toEqual([])
    expect(tx.recipe.update).not.toHaveBeenCalled()
    expect(tx.recipeStep.createMany).not.toHaveBeenCalled()
  })

  it('refuses steps that point at an ingredient not in this recipe', async () => {
    const tx = fakeTx(empty)
    const out = await applyEnrichment(tx, 'rec1', { steps: [{ text: 'Fry {ing:someoneElses}', timerSeconds: null }] })
    expect(out.applied).toEqual([])
    expect(out.skipped[0]).toMatch(/refers to an ingredient/)
    expect(tx.recipeStep.createMany).not.toHaveBeenCalled()
  })

  it('reports a missing recipe', async () => {
    const out = await applyEnrichment(fakeTx(null), 'gone', { servings: 4 })
    expect(out.skipped).toEqual(['recipe no longer exists'])
  })
})
