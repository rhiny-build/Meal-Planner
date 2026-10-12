/**
 * Integration tests for lib/recipeWrite.ts against a real database:
 * ids stay stable across edits (so step tokens survive), amounts are set,
 * steps are saved in order with timers, and bad tokens are rejected.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  testPrisma,
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from './setup'
import {
  createRecipeFromForm,
  updateRecipeFromForm,
  RecipeValidationError,
} from '../../lib/recipeWrite'
import type { RecipeFormData } from '../../types'

const base: RecipeFormData = {
  name: 'Beef Keema with Peas',
  ingredients: '',
  prepTime: 'medium',
  tier: 'favorite',
}

describe('recipeWrite integration', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })
  afterAll(async () => {
    await teardownTestDatabase()
  })
  beforeEach(async () => {
    await clearTestDatabase()
  })

  it('creates a recipe with amounts, kind, servings and steps', async () => {
    const recipe = await createRecipeFromForm(testPrisma, {
      ...base,
      kind: 'full',
      servings: 4,
      notes: 'Freezes well',
      structuredIngredients: [
        { id: 'mince1', name: 'beef mince', quantity: '500', unit: 'g', order: 0 },
        { id: 'peas1', name: 'peas', quantity: 'a handful', order: 1 },
      ],
      steps: [
        { text: 'Brown {ing:mince1}.', timerSeconds: 600 },
        { text: 'Stir in {ing:peas1}.' },
      ],
    })
    expect(recipe.kind).toBe('full')
    expect(recipe.servings).toBe(4)
    expect(recipe.ingredients).toBe('500 g beef mince\na handful peas')
    expect(recipe.structuredIngredients.map((i) => i.amount)).toEqual([500, null])
    expect(recipe.steps.map((s) => [s.order, s.text, s.timerSeconds])).toEqual([
      [0, 'Brown {ing:mince1}.', 600],
      [1, 'Stir in {ing:peas1}.', null],
    ])
  })

  it('keeps ingredient ids stable on update, so existing step tokens still resolve', async () => {
    const created = await createRecipeFromForm(testPrisma, {
      ...base,
      structuredIngredients: [{ name: 'flour', quantity: '200', unit: 'g', order: 0 }],
    })
    const flourId = created.structuredIngredients[0].id

    const updated = await updateRecipeFromForm(testPrisma, created.id, {
      structuredIngredients: [
        { id: flourId, name: 'plain flour', quantity: '300', unit: 'g', order: 0 },
        { id: 'new1', name: 'milk', quantity: '1', unit: 'cup', order: 1 },
      ],
      steps: [{ text: 'Whisk {ing:' + flourId + '} with {ing:new1}', timerSeconds: 90 }],
    })
    expect(updated.structuredIngredients.map((i) => i.id)).toEqual([flourId, 'new1'])
    expect(updated.structuredIngredients[0]).toMatchObject({ name: 'plain flour', amount: 300 })
    expect(updated.steps[0].timerSeconds).toBe(90)
  })

  it('deletes removed ingredients and replaces steps (reorder + remove)', async () => {
    const created = await createRecipeFromForm(testPrisma, {
      ...base,
      structuredIngredients: [
        { id: 'a', name: 'a', order: 0 },
        { id: 'b', name: 'b', order: 1 },
      ],
      steps: [{ text: 'one' }, { text: 'two' }, { text: 'three' }],
    })
    const updated = await updateRecipeFromForm(testPrisma, created.id, {
      structuredIngredients: [{ id: 'b', name: 'b', order: 0 }],
      steps: [{ text: 'three' }, { text: 'one' }],
    })
    expect(updated.structuredIngredients.map((i) => i.id)).toEqual(['b'])
    expect(updated.steps.map((s) => s.text)).toEqual(['three', 'one'])
    expect(await testPrisma.recipeStep.count({ where: { recipeId: created.id } })).toBe(2)
  })

  it('leaves the method untouched when steps are not sent, and clears it when sent empty', async () => {
    const created = await createRecipeFromForm(testPrisma, {
      ...base,
      structuredIngredients: [{ name: 'x', order: 0 }],
      steps: [{ text: 'keep me' }],
    })
    const renamed = await updateRecipeFromForm(testPrisma, created.id, { name: 'Renamed' })
    expect(renamed.steps).toHaveLength(1)
    const cleared = await updateRecipeFromForm(testPrisma, created.id, { steps: [] })
    expect(cleared.steps).toHaveLength(0)
  })

  it('marks a recipe quick', async () => {
    const created = await createRecipeFromForm(testPrisma, {
      ...base,
      name: 'Simple Fries',
      structuredIngredients: [{ name: 'potatoes', order: 0 }],
    })
    const updated = await updateRecipeFromForm(testPrisma, created.id, { kind: 'quick' })
    expect(updated.kind).toBe('quick')
    const quick = await testPrisma.recipe.findMany({ where: { kind: 'quick' } })
    expect(quick.map((r) => r.name)).toEqual(['Simple Fries'])
  })

  it('rejects a step that refers to an ingredient not in the recipe, and saves nothing', async () => {
    const created = await createRecipeFromForm(testPrisma, {
      ...base,
      structuredIngredients: [{ id: 'a', name: 'a', order: 0 }],
    })
    await expect(
      updateRecipeFromForm(testPrisma, created.id, {
        name: 'Should not save',
        steps: [{ text: 'Add {ing:ghost}' }],
      })
    ).rejects.toBeInstanceOf(RecipeValidationError)
    const after = await testPrisma.recipe.findUnique({ where: { id: created.id } })
    expect(after?.name).toBe(base.name)
  })

  it('rejects a bad kind and a bad timer', async () => {
    const created = await createRecipeFromForm(testPrisma, {
      ...base,
      structuredIngredients: [{ name: 'x', order: 0 }],
    })
    await expect(
      updateRecipeFromForm(testPrisma, created.id, { kind: 'huge' as any })
    ).rejects.toBeInstanceOf(RecipeValidationError)
    await expect(
      updateRecipeFromForm(testPrisma, created.id, { steps: [{ text: 'x', timerSeconds: -5 }] })
    ).rejects.toBeInstanceOf(RecipeValidationError)
  })
  // Regression (run RUN-phase1-fixes, bug 2): "Update Recipe" with new steps saved nothing on the
  // hosted preview. The write ran one query per ingredient inside an interactive transaction,
  // and Prisma cuts those off after 5 s ("Transaction not found"). Against a remote database
  // every query is a round trip, so a normal recipe went over the limit. This simulates the
  // round trip with a per-query delay: the old code needed ~19 queries (> 5 s at 300 ms each).
  it('saves steps on a recipe with many ingredients even when every query is slow', async () => {
    const created = await createRecipeFromForm(testPrisma, {
      ...base,
      structuredIngredients: Array.from({ length: 12 }, (_, i) => ({
        id: `ing${i}`,
        name: `ingredient ${i}`,
        quantity: String(i + 1),
        unit: 'g',
        order: i,
      })),
    })
    const slow = testPrisma.$extends({
      query: {
        $allOperations: async ({ args, query }) => {
          await new Promise((r) => setTimeout(r, 300))
          return query(args)
        },
      },
    })
    const started = Date.now()
    const updated = await updateRecipeFromForm(slow as unknown as typeof testPrisma, created.id, {
      structuredIngredients: created.structuredIngredients.map((i, order) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        notes: i.notes,
        order,
      })),
      steps: [
        { text: 'Mix {ing:ing0} and {ing:ing1}', timerSeconds: null },
        { text: 'Rest', timerSeconds: 300 },
      ],
    })
    expect(Date.now() - started).toBeLessThan(5000)
    expect(updated.steps.map((s) => [s.text, s.timerSeconds])).toEqual([
      ['Mix {ing:ing0} and {ing:ing1}', null],
      ['Rest', 300],
    ])
    expect(await testPrisma.recipeStep.count({ where: { recipeId: created.id } })).toBe(2)
  }, 40_000)

  it('still updates an ingredient that changed and adds a new one in one save', async () => {
    const created = await createRecipeFromForm(testPrisma, {
      ...base,
      structuredIngredients: [
        { id: 'a', name: 'a', quantity: '1', unit: 'g', order: 0 },
        { id: 'b', name: 'b', quantity: '2', unit: 'g', order: 1 },
      ],
    })
    const updated = await updateRecipeFromForm(testPrisma, created.id, {
      structuredIngredients: [
        { id: 'a', name: 'a', quantity: '1', unit: 'g', order: 0 },
        { id: 'b', name: 'b', quantity: '5', unit: 'kg', order: 1 },
        { id: 'c', name: 'c', quantity: '1/2', unit: 'cup', order: 2 },
      ],
    })
    expect(updated.structuredIngredients.map((i) => [i.id, i.quantity, i.unit, i.amount])).toEqual([
      ['a', '1', 'g', 1],
      ['b', '5', 'kg', 5],
      ['c', '1/2', 'cup', 0.5],
    ])
  })
})
