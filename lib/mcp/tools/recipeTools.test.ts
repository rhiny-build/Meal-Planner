import { describe, it, expect, vi, beforeEach } from 'vitest'

const { db } = vi.hoisted(() => {
  const db: any = {
    recipe: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    ingredient: { deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() },
    recipeStep: { createMany: vi.fn(), deleteMany: vi.fn() },
  }
  db.$transaction = vi.fn(async (cb: (tx: unknown) => unknown) => cb(db))
  return { db }
})
vi.mock('@/lib/prisma', () => ({ prisma: db }))

import { createRecipeHandler } from './createRecipe'
import { getRecipeHandler } from './getRecipe'
import { getRecipesHandler } from './getRecipes'
import { updateRecipeHandler } from './updateRecipe'

const parse = (r: { content: Array<{ text: string }> }) => JSON.parse(r.content[0].text)

beforeEach(() => {
  vi.clearAllMocks()
  db.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(db))
})

describe('create_recipe handler', () => {
  function mockCreate(ids = ['i1', 'i2']) {
    db.recipe.create.mockImplementation(async ({ data }: any) => ({
      id: 'r1', name: data.name, kind: data.kind,
      structuredIngredients: data.structuredIngredients.create.map((row: any, idx: number) => ({ ...row, id: ids[idx] })),
    }))
  }

  it('saves the new fields, amounts and converts step references to id tokens', async () => {
    mockCreate()
    const res = parse(await createRecipeHandler({
      name: 'Pancakes', kind: 'full', servings: 4, description: 'Fluffy', totalTimeMinutes: 20, notes: 'Rest batter',
      ingredients: [{ name: 'flour', amount: 300, unit: 'g' }, { name: 'milk', quantity: '1 1/2', unit: 'cups' }],
      steps: [{ text: 'Whisk {ing:1} with {ing:2}.', timerSeconds: 30 }],
      metadata: { source: 'Gran' },
    }))
    expect(res).toMatchObject({ success: true, recipe_id: 'r1', ingredient_count: 2, step_count: 1 })
    const data = db.recipe.create.mock.calls[0][0].data
    expect(data).toMatchObject({ kind: 'full', servings: 4, description: 'Fluffy', totalTimeMinutes: 20, notes: 'Rest batter', tier: 'new', recipeUrl: 'Gran' })
    expect(data.structuredIngredients.create[0]).toMatchObject({ amount: 300, unit: 'g' })
    expect(data.structuredIngredients.create[1]).toMatchObject({ amount: 1.5 })
    expect(db.recipeStep.createMany.mock.calls[0][0].data).toEqual([
      { order: 0, text: 'Whisk {ing:i1} with {ing:i2}.', timerSeconds: 30, recipeId: 'r1' },
    ])
  })

  it('stays backward compatible with the old shape (quantity string, metadata only)', async () => {
    mockCreate()
    const res = parse(await createRecipeHandler({
      name: 'Old', ingredients: [{ name: 'rice', quantity: '2 cups' }, { name: 'salt' }], metadata: { carbs: 'rice' },
    }))
    expect(res.success).toBe(true)
    expect(res.step_count).toBe(0)
    const data = db.recipe.create.mock.calls[0][0].data
    expect(data).toMatchObject({ kind: 'full', servings: null, carbType: 'rice' })
    expect(data.ingredients).toBe('2 cups rice\nsalt')
    expect(db.recipeStep.createMany).not.toHaveBeenCalled()
  })

  it('returns success:false and an error flag for a bad step reference', async () => {
    mockCreate()
    const r = await createRecipeHandler({ name: 'X', ingredients: [{ name: 'a' }], steps: [{ text: 'Use {ing:5}' }] })
    expect(parse(r)).toMatchObject({ success: false })
    expect((r as any).isError).toBe(true)
  })

  it('returns the database error instead of throwing', async () => {
    db.$transaction.mockRejectedValueOnce(new Error('db down'))
    expect(parse(await createRecipeHandler({ name: 'X', ingredients: [] }))).toEqual({ success: false, error: 'db down' })
  })

  it('rejects a blank name', async () => {
    expect(parse(await createRecipeHandler({ name: '  ', ingredients: [] })).success).toBe(false)
  })
})

describe('get_recipe handler', () => {
  it('returns the full recipe with rendered and raw step text', async () => {
    db.recipe.findUnique.mockResolvedValue({
      id: 'r1', name: 'P', kind: 'full', servings: 4, description: 'd', totalTimeMinutes: 20, notes: null,
      proteinType: null, carbType: 'rice', vegetableType: null, recipeUrl: null,
      structuredIngredients: [{ id: 'i1', name: 'flour', amount: 300, unit: 'g', quantity: '300', notes: null }],
      steps: [{ id: 's1', order: 0, text: 'Sift {ing:i1}', timerSeconds: 10 }],
    })
    const res = parse(await getRecipeHandler({ id: 'r1' }))
    expect(res.has_method).toBe(true)
    expect(res.steps[0]).toEqual({ position: 1, text: 'Sift 300 g flour', text_with_references: 'Sift {ing:i1}', timer_seconds: 10 })
    expect(res.ingredients[0]).toMatchObject({ position: 1, ingredient_id: 'i1', amount: 300 })
    expect(res.metadata).toEqual({ carbs: 'rice' })
  })

  it('reports a recipe with no method', async () => {
    db.recipe.findUnique.mockResolvedValue({ id: 'r', name: 'N', kind: 'quick', structuredIngredients: [], steps: [] })
    expect(parse(await getRecipeHandler({ id: 'r' })).has_method).toBe(false)
  })

  it('returns an error for an unknown id', async () => {
    db.recipe.findUnique.mockResolvedValue(null)
    const r = await getRecipeHandler({ id: 'nope' })
    expect(parse(r).success).toBe(false)
    expect((r as any).isError).toBe(true)
  })
})

describe('get_recipes handler', () => {
  it('includes kind and has_method but no steps', async () => {
    db.recipe.findMany.mockResolvedValue([
      { id: 'a', name: 'A', kind: 'full', servings: 2, proteinType: 'fish', carbType: null, vegetableType: null, recipeUrl: null,
        structuredIngredients: [{ name: 'cod', quantity: '2', unit: null }], _count: { steps: 3 } },
      { id: 'b', name: 'B', kind: 'quick', servings: null, proteinType: null, carbType: null, vegetableType: null, recipeUrl: null,
        structuredIngredients: [], _count: { steps: 0 } },
    ])
    const res = parse(await getRecipesHandler({ query: 'a' }))
    expect(res.recipes[0]).toMatchObject({ recipe_id: 'a', kind: 'full', has_method: true, servings: 2 })
    expect(res.recipes[1]).toMatchObject({ kind: 'quick', has_method: false })
    expect(JSON.stringify(res)).not.toContain('steps')
    expect(db.recipe.findMany.mock.calls[0][0].where).toEqual({ name: { contains: 'a', mode: 'insensitive' } })
  })
})

describe('update_recipe handler', () => {
  const existing = {
    id: 'r1', name: 'Dal',
    structuredIngredients: [{ id: 'o1', name: 'Lentils' }, { id: 'o2', name: 'Onion' }],
    steps: [{ order: 0, text: 'Rinse {ing:o1}', timerSeconds: null }],
  }

  it('patches only the given fields and replaces steps using existing ingredient positions', async () => {
    db.recipe.findUnique.mockResolvedValue(existing)
    db.recipe.update.mockResolvedValue({ id: 'r1', name: 'Dal' })
    const res = parse(await updateRecipeHandler({
      id: 'r1', servings: 4, notes: null, steps: [{ text: 'Simmer {ing:1}', timerSeconds: 900 }, { text: 'Fry {ing:2}' }],
    }))
    expect(res).toMatchObject({ success: true, changed: ['servings', 'notes', 'steps'], step_count: 2 })
    expect(db.recipe.update.mock.calls[0][0].data).toEqual({ servings: 4, notes: null })
    expect(db.ingredient.deleteMany).not.toHaveBeenCalled()
    expect(db.recipeStep.deleteMany).toHaveBeenCalledWith({ where: { recipeId: 'r1' } })
    expect(db.recipeStep.createMany.mock.calls[0][0].data.map((s: any) => s.text)).toEqual(['Simmer {ing:o1}', 'Fry {ing:o2}'])
  })

  it('replaces ingredients, regenerates legacy text and remaps kept steps', async () => {
    db.recipe.findUnique.mockResolvedValue(existing)
    db.ingredient.findMany.mockResolvedValue([{ id: 'n1', name: 'lentils' }])
    db.recipe.update.mockResolvedValue({ id: 'r1', name: 'Dal' })
    const res = parse(await updateRecipeHandler({ id: 'r1', ingredients: [{ name: 'lentils', amount: 200, unit: 'g' }] }))
    expect(res).toMatchObject({ success: true, ingredient_count: 1, step_count: 1 })
    expect(db.recipe.update.mock.calls[0][0].data.ingredients).toBe('200 g lentils')
    expect(db.recipeStep.createMany.mock.calls[0][0].data[0].text).toBe('Rinse {ing:n1}')
  })

  it('removes the method when steps is []', async () => {
    db.recipe.findUnique.mockResolvedValue(existing)
    const res = parse(await updateRecipeHandler({ id: 'r1', steps: [] }))
    expect(res).toMatchObject({ success: true, step_count: 0 })
    expect(db.recipeStep.deleteMany).toHaveBeenCalled()
    expect(db.recipeStep.createMany).not.toHaveBeenCalled()
    expect(db.recipe.update).not.toHaveBeenCalled()
  })

  it('errors for an unknown recipe and for a bad reference', async () => {
    db.recipe.findUnique.mockResolvedValueOnce(null)
    expect(parse(await updateRecipeHandler({ id: 'x', name: 'N' })).success).toBe(false)
    db.recipe.findUnique.mockResolvedValueOnce(existing)
    const r = parse(await updateRecipeHandler({ id: 'r1', steps: [{ text: '{ing:9}' }] }))
    expect(r.success).toBe(false)
    expect(r.error).toContain('Step 1')
  })
})
