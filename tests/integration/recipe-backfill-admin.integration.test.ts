/**
 * Admin backfill, one recipe per call (integration). Real Postgres (local scratch database), no model:
 * the importer is replaced by a REPLAY of a real recorded run (tests/fixtures/backfillAdminCodRun.json).
 * Checks that planning writes nothing, apply only fills empty fields, repeating apply changes nothing,
 * and a merge keeps the meal-plan day.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { testPrisma, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'
import { applyBackfillEntry, listBackfillRecipes, planBackfillRecipe } from '@/lib/agents/recipeBackfill/adminSteps'
import type { PlanDeps } from '@/lib/agents/recipeBackfill/plan'
import recorded from '../fixtures/backfillAdminCodRun.json'

const REPLAY_RUN_ID = 'replayed-run'

const replayImporter: PlanDeps['runImporter'] = async () => ({
  runId: REPLAY_RUN_ID,
  ok: true,
  output: recorded.run.output as never,
})

async function fingerprint() {
  return JSON.stringify({
    recipes: await testPrisma.recipe.findMany({ orderBy: { id: 'asc' } }),
    ingredients: await testPrisma.ingredient.findMany({ orderBy: { id: 'asc' } }),
    steps: await testPrisma.recipeStep.findMany({ orderBy: { id: 'asc' } }),
    plans: await testPrisma.mealPlan.findMany({ orderBy: { id: 'asc' } }),
  })
}

async function seedBook() {
  const cod = await testPrisma.recipe.create({
    data: {
      id: recorded.recipe.id,
      name: recorded.recipe.name,
      ingredients: 'cod',
      tier: 'favorite',
      recipeUrl: recorded.recipe.recipeUrl,
      notes: 'Ronen note',
      structuredIngredients: {
        create: recorded.recipe.ingredients.map((i) => ({ id: i.id, name: i.name, quantity: i.quantity, unit: i.unit, order: i.order })),
      },
    },
  })
  const fries = await testPrisma.recipe.create({ data: { name: 'Simple Fries', ingredients: 'fries', tier: 'favorite' } })
  const family = await testPrisma.recipe.create({
    data: { name: "Shini's Chicken Soup", ingredients: 'chicken', tier: 'favorite', structuredIngredients: { create: [{ name: 'a', order: 0 }, { name: 'b', order: 1 }, { name: 'c', order: 2 }] } },
  })
  const keeper = await testPrisma.recipe.create({
    data: { name: 'Cucumber Salad', ingredients: 'cucumber', tier: 'favorite', servings: 4, notes: 'keep me', structuredIngredients: { create: [{ name: 'a', order: 0 }, { name: 'b', order: 1 }, { name: 'c', order: 2 }] } },
  })
  const copy = await testPrisma.recipe.create({ data: { name: 'Cucumber Salad', ingredients: 'cucumber', tier: 'favorite' } })
  await testPrisma.mealPlan.create({ data: { date: new Date('2026-05-04T00:00:00Z'), dayOfWeek: 'monday', lunchRecipeId: copy.id } })
  await testPrisma.agentRun.create({
    data: {
      id: REPLAY_RUN_ID, agent: 'recipe-importer', trigger: 'batch', input: {}, status: 'succeeded',
      inputTokens: recorded.run.inputTokens, outputTokens: recorded.run.outputTokens,
      cacheReadTokens: recorded.run.cacheReadTokens, cacheCreationTokens: recorded.run.cacheCreationTokens,
    },
  })
  return { cod, fries, family, keeper, copy }
}

describe('admin backfill, one recipe at a time', () => {
  beforeAll(async () => { await setupTestDatabase() })
  afterAll(async () => { await teardownTestDatabase() })
  beforeEach(async () => { await clearTestDatabase() })

  it('lists every recipe for the page to walk through', async () => {
    await seedBook()
    expect((await listBackfillRecipes(testPrisma)).map((r) => r.name)).toContain('Baked Cod with Tomatoes')
  })

  it('plans each kind of recipe without changing any recipe', async () => {
    const { cod, fries, family, copy } = await seedBook()
    const before = await fingerprint()

    const enrich = await planBackfillRecipe(testPrisma, cod.id, replayImporter)
    expect(enrich?.entry.action).toBe('enrich')
    expect(enrich?.entry.runId).toBe(REPLAY_RUN_ID)
    expect(enrich?.entry.changes?.steps).toHaveLength(4)
    expect(enrich?.usage.outputTokens).toBe(recorded.run.outputTokens)
    expect(enrich?.estimatedCostUsd).toBeGreaterThan(0)

    const quick = await planBackfillRecipe(testPrisma, fries.id, replayImporter)
    expect(quick?.entry.action).toBe('quick')
    expect(quick?.estimatedCostUsd).toBe(0)

    expect((await planBackfillRecipe(testPrisma, family.id, replayImporter))?.entry.action).toBe('leave')
    const duplicate = await planBackfillRecipe(testPrisma, copy.id, replayImporter)
    expect(duplicate?.entry.action).toBe('duplicate')
    expect(duplicate?.entry.approved).toBe(false)

    expect(await fingerprint()).toBe(before)
  })

  it('returns null for a recipe that no longer exists', async () => {
    expect(await planBackfillRecipe(testPrisma, 'gone', replayImporter)).toBeNull()
  })

  it('applies an enrich row once and repeating it changes nothing', async () => {
    const { cod } = await seedBook()
    const { entry } = (await planBackfillRecipe(testPrisma, cod.id, replayImporter))!

    expect((await applyBackfillEntry(testPrisma, entry)).status).toBe('applied')
    const afterFirst = await fingerprint()
    expect(await testPrisma.recipeStep.count({ where: { recipeId: cod.id } })).toBe(4)
    expect((await testPrisma.recipe.findUnique({ where: { id: cod.id } }))?.notes).toBe('Ronen note')

    expect((await applyBackfillEntry(testPrisma, entry)).status).toBe('nothing-to-do')
    expect(await fingerprint()).toBe(afterFirst)
  })

  it('never replaces steps the recipe already has', async () => {
    const { cod } = await seedBook()
    const { entry } = (await planBackfillRecipe(testPrisma, cod.id, replayImporter))!
    await testPrisma.recipeStep.create({ data: { recipeId: cod.id, order: 0, text: 'My own method' } })

    await applyBackfillEntry(testPrisma, entry)

    const steps = await testPrisma.recipeStep.findMany({ where: { recipeId: cod.id } })
    expect(steps.map((s) => s.text)).toEqual(['My own method'])
  })

  it('marks a quick row once and repeating it changes nothing', async () => {
    const { fries } = await seedBook()
    const { entry } = (await planBackfillRecipe(testPrisma, fries.id, replayImporter))!
    expect((await applyBackfillEntry(testPrisma, entry)).status).toBe('applied')
    expect((await applyBackfillEntry(testPrisma, entry)).status).toBe('nothing-to-do')
    expect((await testPrisma.recipe.findUnique({ where: { id: fries.id } }))?.kind).toBe('quick')
  })

  it('merges a ticked duplicate, keeps the meal-plan day, and a repeat does nothing', async () => {
    const { keeper, copy } = await seedBook()
    const { entry } = (await planBackfillRecipe(testPrisma, copy.id, replayImporter))!

    expect((await applyBackfillEntry(testPrisma, entry)).status).toBe('applied')
    expect(await testPrisma.recipe.findUnique({ where: { id: copy.id } })).toBeNull()
    expect((await testPrisma.mealPlan.findFirst())?.lunchRecipeId).toBe(keeper.id)

    expect((await applyBackfillEntry(testPrisma, entry)).status).toBe('nothing-to-do')
  })

  it('skips a row whose recipe was renamed since the dry run', async () => {
    const { fries } = await seedBook()
    const { entry } = (await planBackfillRecipe(testPrisma, fries.id, replayImporter))!
    await testPrisma.recipe.update({ where: { id: fries.id }, data: { name: 'Renamed' } })
    expect((await applyBackfillEntry(testPrisma, entry)).status).toBe('skipped')
  })
})
