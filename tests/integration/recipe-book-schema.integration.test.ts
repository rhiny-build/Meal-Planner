/**
 * Recipe book and agent-run schema integration tests (S03)
 *
 * Confirms defaults, cascades and the step-token helpers against real Postgres.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { testPrisma, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'
import { parseAmount } from '@/lib/ingredientAmount'
import { makeIngredientToken, renderStepText, validateStepText } from '@/lib/recipeStepTokens'

describe('Recipe book schema', () => {
  beforeAll(async () => { await setupTestDatabase() })
  afterAll(async () => { await teardownTestDatabase() })
  beforeEach(async () => { await clearTestDatabase() })

  it('defaults a recipe to kind full with no steps and null new fields', async () => {
    const recipe = await testPrisma.recipe.create({
      data: { name: 'Plain', ingredients: 'rice', tier: 'new' },
      include: { steps: true },
    })
    expect(recipe.kind).toBe('full')
    expect(recipe.servings).toBeNull()
    expect(recipe.description).toBeNull()
    expect(recipe.totalTimeMinutes).toBeNull()
    expect(recipe.notes).toBeNull()
    expect(recipe.steps).toEqual([])
  })

  it('stores steps that reference ingredients and renders them scaled', async () => {
    const recipe = await testPrisma.recipe.create({
      data: {
        name: 'Pancakes',
        ingredients: '200 g flour',
        tier: 'favorite',
        kind: 'quick',
        servings: 4,
        structuredIngredients: {
          create: [{ name: 'flour', quantity: '200', unit: 'g', amount: parseAmount('200', 'g').amount, order: 0 }],
        },
      },
      include: { structuredIngredients: true },
    })
    const flour = recipe.structuredIngredients[0]
    await testPrisma.recipeStep.createMany({
      data: [
        { recipeId: recipe.id, order: 1, text: `Whisk ${makeIngredientToken(flour.id)} with milk.`, timerSeconds: 120 },
        { recipeId: recipe.id, order: 0, text: 'Heat the pan.' },
      ],
    })

    const steps = await testPrisma.recipeStep.findMany({ where: { recipeId: recipe.id }, orderBy: { order: 'asc' } })
    expect(steps.map((s) => s.text[0])).toEqual(['H', 'W'])
    expect(steps[1].timerSeconds).toBe(120)
    expect(validateStepText(steps[1].text, [flour.id]).valid).toBe(true)
    expect(renderStepText(steps[1].text, recipe.structuredIngredients, 2)).toBe('Whisk 400 g flour with milk.')

    // Deleting the ingredient leaves the step readable
    await testPrisma.ingredient.delete({ where: { id: flour.id } })
    expect(renderStepText(steps[1].text, [])).toBe('Whisk the ingredient with milk.')

    // Deleting the recipe removes its steps
    await testPrisma.recipe.delete({ where: { id: recipe.id } })
    expect(await testPrisma.recipeStep.count()).toBe(0)
  })

  it('stores an agent run with ordered steps and cascades on delete', async () => {
    const run = await testPrisma.agentRun.create({
      data: { agent: 'restock', trigger: 'manual', input: { receipt: 'abc' } },
    })
    expect(run.status).toBe('running')
    expect(run.inputTokens).toBe(0)

    await testPrisma.agentStep.createMany({
      data: [
        { runId: run.id, order: 0, kind: 'model', payload: { stop_reason: 'tool_use' }, inputTokens: 100, outputTokens: 20 },
        { runId: run.id, order: 1, kind: 'tool_call', toolName: 'search_master_list', payload: { query: 'milk' } },
        { runId: run.id, order: 2, kind: 'tool_result', toolName: 'search_master_list', payload: { matches: [] } },
      ],
    })
    await testPrisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'succeeded', output: { proposals: [] }, finishedAt: new Date(), inputTokens: 100, outputTokens: 20 },
    })

    const loaded = await testPrisma.agentRun.findUniqueOrThrow({
      where: { id: run.id },
      include: { steps: { orderBy: { order: 'asc' } } },
    })
    expect(loaded.status).toBe('succeeded')
    expect(loaded.steps.map((s) => s.kind)).toEqual(['model', 'tool_call', 'tool_result'])
    expect(loaded.steps[0].inputTokens).toBe(100)
    expect(loaded.steps[1].inputTokens).toBeNull()

    await testPrisma.agentRun.delete({ where: { id: run.id } })
    expect(await testPrisma.agentStep.count()).toBe(0)
  })
})
