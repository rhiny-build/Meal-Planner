import { describe, it, expect, vi, beforeEach } from 'vitest'

const tx = vi.hoisted(() => ({
  recipe: { create: vi.fn() },
  recipeStep: { createMany: vi.fn() },
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    dishType: { findMany: vi.fn().mockResolvedValue([{ value: 'chicken', category: 'protein' }]) },
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}))

import { saveRecipeDraft } from './saveDraft'
import type { RecipeDraft } from './types'

const draft: RecipeDraft = {
  name: 'Schnitzel',
  kind: 'full',
  description: null,
  servings: 4,
  totalTimeMinutes: 30,
  prepTime: 'medium',
  sourceUrl: 'https://x.test/r',
  notes: null,
  ingredients: [
    { key: 'i1', name: 'chicken breast', quantity: '2', unit: null, amount: 2, notes: 'flattened' },
    { key: 'i2', name: 'breadcrumbs', quantity: '1 1/2', unit: 'cups', amount: 1.5, notes: null },
  ],
  steps: [
    { text: 'Coat {ing:i1} in {ing:i2}.', timerSeconds: null },
    { text: 'Fry for 4 minutes a side.', timerSeconds: 240 },
  ],
  proteinType: 'chicken',
  carbType: null,
  includesVegetables: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  tx.recipe.create.mockResolvedValue({
    id: 'r1',
    structuredIngredients: [{ id: 'cabc' }, { id: 'cdef' }],
  })
})

describe('saveRecipeDraft', () => {
  it('creates the recipe with ingredients, tier "new" and the legacy ingredient text', async () => {
    await saveRecipeDraft(draft)
    const data = tx.recipe.create.mock.calls[0][0].data
    expect(data).toMatchObject({
      name: 'Schnitzel',
      kind: 'full',
      servings: 4,
      recipeUrl: 'https://x.test/r',
      tier: 'new',
      vegetableType: 'vegetable',
      proteinType: 'chicken',
      ingredients: '2 chicken breast (flattened)\n1 1/2 cups breadcrumbs',
    })
    expect(data.structuredIngredients.create[1]).toEqual({
      name: 'breadcrumbs', quantity: '1 1/2', unit: 'cups', amount: 1.5, notes: null, order: 1,
    })
  })

  it('rewrites draft keys in step text to the real ingredient ids', async () => {
    await saveRecipeDraft(draft)
    const steps = tx.recipeStep.createMany.mock.calls[0][0].data
    expect(steps).toEqual([
      { recipeId: 'r1', order: 0, text: 'Coat {ing:cabc} in {ing:cdef}.', timerSeconds: null },
      { recipeId: 'r1', order: 1, text: 'Fry for 4 minutes a side.', timerSeconds: 240 },
    ])
  })

  it('writes no steps for a recipe without a method', async () => {
    await saveRecipeDraft({ ...draft, steps: [] })
    expect(tx.recipeStep.createMany).not.toHaveBeenCalled()
  })

  it('re-validates the draft and refuses a bad one without writing', async () => {
    await expect(
      saveRecipeDraft({ ...draft, steps: [{ text: 'Add {ing:nope}', timerSeconds: null }] })
    ).rejects.toThrow('unknown ingredient key')
    await expect(saveRecipeDraft({ ...draft, name: '' })).rejects.toThrow('name is required')
    expect(tx.recipe.create).not.toHaveBeenCalled()
  })

  it('drops a source url that is not http(s)', async () => {
    await saveRecipeDraft({ ...draft, sourceUrl: 'javascript:alert(1)' })
    expect(tx.recipe.create.mock.calls[0][0].data.recipeUrl).toBeNull()
  })
})
