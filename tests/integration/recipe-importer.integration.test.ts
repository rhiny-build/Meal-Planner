/**
 * Recipe importer integration tests (S05)
 *
 * Real Postgres. Claude is replaced by a scripted fake, so this checks our own code:
 * the loop writes the run log in order, find_similar_recipes queries correctly, and a
 * reviewed draft is saved with its step tokens rewritten to real ingredient ids.
 *
 * Needs TEST_DATABASE_URL, DATABASE_URL and DATABASE_URL_UNPOOLED all pointing at the test database.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

const mockAnthropic = vi.hoisted(() => ({ messages: { create: vi.fn() } }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = mockAnthropic.messages
  },
}))

import { testPrisma, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'
import { runRecipeImporter } from '@/lib/agents/recipeImporter'
import { findSimilarRecipes } from '@/lib/agents/recipeImporter/tools'
import { saveRecipeDraft } from '@/lib/agents/recipeImporter/saveDraft'
import { getStepIngredientIds, renderStepText } from '@/lib/recipeStepTokens'

const usage = { input_tokens: 100, output_tokens: 20 }
const toolUse = (id: string, name: string, input: unknown) => ({ type: 'tool_use', id, name, input })

const submission = {
  name: 'Family Schnitzel',
  kind: 'full',
  description: null,
  servings: 4,
  totalTimeMinutes: null,
  prepTime: null,
  notes: null,
  ingredients: [
    { key: 'i1', name: 'chicken breast', quantity: '2', unit: null, notes: 'flattened' },
    { key: 'i2', name: 'breadcrumbs', quantity: '1 1/2', unit: 'cups', notes: null },
  ],
  steps: [{ text: 'Coat {ing:i1} in {ing:i2}, then fry 4 minutes a side.', timerSeconds: 240 }],
  proteinType: 'chicken',
  carbType: null,
  includesVegetables: false,
}

describe('Recipe importer', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })
  afterAll(async () => {
    await teardownTestDatabase()
  })
  beforeEach(async () => {
    await clearTestDatabase()
    await testPrisma.dishType.deleteMany()
    await testPrisma.dishType.create({ data: { value: 'chicken', label: 'Chicken', category: 'protein', order: 0 } })
    mockAnthropic.messages.create.mockReset()
  })

  it('records a full run in order and returns a draft that saves with real step ids', async () => {
    await testPrisma.recipe.create({ data: { name: 'Chicken Schnitzel', ingredients: 'chicken', tier: 'favorite' } })
    mockAnthropic.messages.create
      .mockResolvedValueOnce({
        content: [toolUse('t1', 'find_similar_recipes', { name: 'Family schnitzel' })],
        stop_reason: 'tool_use',
        usage,
      })
      .mockResolvedValueOnce({
        content: [toolUse('t2', 'submit_recipe', submission)],
        stop_reason: 'tool_use',
        usage,
      })

    const result = await runRecipeImporter({ text: 'my schnitzel: chicken, crumbs, fry 4 min a side' })
    expect(result.ok).toBe(true)
    expect(result.output!.similarRecipes.map((r) => r.name)).toEqual(['Chicken Schnitzel'])

    // run log
    const run = await testPrisma.agentRun.findUniqueOrThrow({
      where: { id: result.runId },
      include: { steps: { orderBy: { order: 'asc' } } },
    })
    expect(run).toMatchObject({ agent: 'recipe-importer', trigger: 'manual', status: 'succeeded', inputTokens: 200, outputTokens: 40 })
    expect(run.finishedAt).not.toBeNull()
    expect(run.steps.map((s) => [s.order, s.kind, s.toolName])).toEqual([
      [0, 'model', null],
      [1, 'tool_call', 'find_similar_recipes'],
      [2, 'tool_result', 'find_similar_recipes'],
      [3, 'model', null],
      [4, 'tool_call', 'submit_recipe'],
      [5, 'tool_result', 'submit_recipe'],
    ])
    expect(await testPrisma.recipe.count()).toBe(1) // the importer did not save anything

    // saving the reviewed draft
    const saved = await saveRecipeDraft(result.output!.draft)
    const recipe = await testPrisma.recipe.findUniqueOrThrow({
      where: { id: saved.id },
      include: { structuredIngredients: { orderBy: { order: 'asc' } }, steps: { orderBy: { order: 'asc' } } },
    })
    expect(recipe).toMatchObject({ kind: 'full', servings: 4, tier: 'new', proteinType: 'chicken' })
    expect(recipe.structuredIngredients.map((i) => [i.name, i.quantity, i.unit, i.amount])).toEqual([
      ['chicken breast', '2', null, 2],
      ['breadcrumbs', '1 1/2', 'cups', 1.5],
    ])
    expect(recipe.steps).toHaveLength(1)
    const ids = getStepIngredientIds(recipe.steps[0].text)
    expect(ids).toEqual(recipe.structuredIngredients.map((i) => i.id))
    expect(renderStepText(recipe.steps[0].text, recipe.structuredIngredients)).toBe(
      'Coat 2 chicken breast in 1.5 cups breadcrumbs, then fry 4 minutes a side.'
    )
    expect(recipe.steps[0].timerSeconds).toBe(240)
  })

  it('saves a recipe with no method as a recipe with no steps', async () => {
    const saved = await saveRecipeDraft({
      ...submission,
      steps: [],
      sourceUrl: null,
      ingredients: submission.ingredients.map((i) => ({ ...i, amount: null })),
    })
    expect(await testPrisma.recipeStep.count({ where: { recipeId: saved.id } })).toBe(0)
  })

  it('records a failed run when the model never submits', async () => {
    mockAnthropic.messages.create.mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, I cannot.' }],
      stop_reason: 'end_turn',
      usage,
    })
    const result = await runRecipeImporter({ text: 'x' })
    expect(result.ok).toBe(false)
    const run = await testPrisma.agentRun.findUniqueOrThrow({
      where: { id: result.runId },
      include: { steps: { orderBy: { order: 'asc' } } },
    })
    expect(run.status).toBe('failed')
    expect(run.error).toContain('submit_recipe')
    expect(run.steps.map((s) => s.kind)).toEqual(['model', 'note', 'model'])
  })

  it('finds similar recipes case-insensitively and ignores unrelated ones', async () => {
    await testPrisma.recipe.createMany({
      data: [
        { name: 'CHICKEN SCHNITZEL', ingredients: 'x', tier: 'favorite' },
        { name: 'Beef Stew', ingredients: 'x', tier: 'favorite' },
        { name: 'Chicken Curry Special', ingredients: 'x', tier: 'favorite' },
      ],
    })
    const { matches } = await findSimilarRecipes({ name: 'chicken schnitzel' })
    expect(matches.map((m) => m.name)).toEqual(['CHICKEN SCHNITZEL'])
  })
})
