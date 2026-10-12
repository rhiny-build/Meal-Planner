/**
 * Recipe backfill integration tests (S07)
 *
 * Real Postgres (a local scratch database only), no model: the importer is replaced by a scripted function.
 * Checks the things that protect real data: the dry run writes no recipe data, apply only fills empty
 * fields, re-running changes nothing, a duplicate merge keeps every meal-plan day, and the CLI refuses
 * to apply without the backup confirmation.
 *
 * Needs TEST_DATABASE_URL, DATABASE_URL and DATABASE_URL_UNPOOLED all pointing at the test database.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { spawnSync } from 'child_process'
import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { testPrisma, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'
import { applyReport } from '@/lib/agents/recipeBackfill/apply'
import { buildBackfillPlan, type PlanDeps } from '@/lib/agents/recipeBackfill/plan'
import type { BackfillReport, ReportEntry } from '@/lib/agents/recipeBackfill/types'
import type { RecipeDraft } from '@/lib/agents/recipeImporter/types'

/** Everything about recipes, ingredients, steps and meal plans, so "nothing changed" is one comparison. */
async function fingerprint() {
  return JSON.stringify({
    recipes: await testPrisma.recipe.findMany({ orderBy: { id: 'asc' } }),
    ingredients: await testPrisma.ingredient.findMany({ orderBy: { id: 'asc' } }),
    steps: await testPrisma.recipeStep.findMany({ orderBy: { id: 'asc' } }),
    plans: await testPrisma.mealPlan.findMany({ orderBy: { id: 'asc' } }),
  })
}

const draft = (over: Partial<RecipeDraft> = {}): RecipeDraft => ({
  name: 'x', kind: 'full', description: 'From the page', servings: 6, totalTimeMinutes: 90, prepTime: 'long', sourceUrl: null, notes: 'Page note',
  ingredients: [], steps: [{ text: 'Fry the thing.', timerSeconds: 60 }], proteinType: null, carbType: null, includesVegetables: false, ...over,
})

function planDeps(over: Partial<PlanDeps> = {}): PlanDeps {
  return {
    runImporter: async () => ({ runId: 'scripted', ok: true, output: { draft: draft(), similarRecipes: [] } }),
    runTokens: async () => ({ inputTokens: 100, outputTokens: 10 }),
    sleep: async () => {},
    delayMs: 0,
    tokenBudget: 1_000_000,
    ...over,
  }
}

const reportOf = (entries: ReportEntry[]): BackfillReport => ({
  version: 1, generatedAt: new Date().toISOString(), database: 'test', note: null, model: 'm', recipesInBook: 0,
  tokens: { inputTokens: 0, outputTokens: 0, runs: 0 }, budgetExceeded: false,
  summary: { enrich: 0, quick: 0, leave: 0, duplicate: 0 }, entries,
})

async function seedBook() {
  const goulash = await testPrisma.recipe.create({
    data: {
      name: 'Goulash', ingredients: 'beef', tier: 'favorite', recipeUrl: 'http://localhost:1/g', servings: 4, notes: 'Ronen note',
      structuredIngredients: { create: [{ name: 'beef', quantity: '1', unit: 'kg', amount: 1, order: 0 }, { name: 'onion', order: 1 }] },
    },
    include: { structuredIngredients: true },
  })
  const fries = await testPrisma.recipe.create({ data: { name: 'Simple Fries', ingredients: 'fries', tier: 'favorite' } })
  const keeper = await testPrisma.recipe.create({
    data: { name: 'Sea Bass', ingredients: 'bass', tier: 'new', recipeUrl: 'http://localhost:1/s', structuredIngredients: { create: [{ name: 'bass', order: 0 }] } },
  })
  const copy = await testPrisma.recipe.create({ data: { name: 'Sea Bass', ingredients: 'bass', tier: 'new' } })
  const plans = await Promise.all(
    [0, 1, 2].map((d) =>
      testPrisma.mealPlan.create({
        data: { date: new Date(Date.UTC(2026, 8, 7 + d)), dayOfWeek: 'Monday', proteinRecipeId: d < 2 ? copy.id : keeper.id, carbRecipeId: fries.id },
      })
    )
  )
  return { goulash, fries, keeper, copy, plans }
}

describe('Recipe backfill', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })
  afterAll(async () => {
    await teardownTestDatabase()
  })
  beforeEach(async () => {
    await clearTestDatabase()
  })

  it('dry run: proposes actions from real rows and changes no recipe data', async () => {
    const { copy, keeper } = await seedBook()
    const before = await fingerprint()

    const report = await buildBackfillPlan(testPrisma, planDeps(), { database: 'test', note: null, model: 'm' })

    expect(report.summary).toEqual({ enrich: 2, quick: 1, leave: 0, duplicate: 1 })
    const dup = report.entries.find((e) => e.action === 'duplicate')!
    expect(dup.recipeId).toBe(copy.id)
    expect(dup.merge).toMatchObject({ keeperId: keeper.id, repoint: { protein: 2, lunch: 0, carb: 0, vegetable: 0 } })
    const goulash = report.entries.find((e) => e.name === 'Goulash')!
    // servings (4) and notes were already set, so the page's 6 and "Page note" are not even proposed
    expect(goulash.changes).toMatchObject({ totalTimeMinutes: 90, prepTime: 'long', description: 'From the page' })
    expect(goulash.changes!.servings).toBeUndefined()
    expect(goulash.changes!.notes).toBeUndefined()
    expect(await fingerprint()).toBe(before)
  })

  it('apply: fills only empty fields, never overwrites, and is idempotent', async () => {
    const { goulash } = await seedBook()
    const report = await buildBackfillPlan(testPrisma, planDeps(), { database: 'test', note: null, model: 'm' })
    // Simulate Ronen: drop the duplicate line, then edit the book after the report was made.
    const kept = report.entries.filter((e) => e.action !== 'duplicate')
    await testPrisma.recipe.update({ where: { id: goulash.id }, data: { description: 'Ronen wrote this after the report' } })

    const first = await applyReport(testPrisma, reportOf(kept))
    expect(first.find((r) => r.name === 'Goulash')).toMatchObject({ status: 'applied' })

    const after = await testPrisma.recipe.findUnique({ where: { id: goulash.id }, include: { steps: true } })
    expect(after).toMatchObject({ servings: 4, notes: 'Ronen note', description: 'Ronen wrote this after the report', totalTimeMinutes: 90, prepTime: 'long' })
    expect(after!.steps.map((s) => s.text)).toEqual(['Fry the thing.'])
    expect(await testPrisma.recipe.findFirst({ where: { name: 'Simple Fries' } })).toMatchObject({ kind: 'quick' })

    const snapshot = await fingerprint()
    const second = await applyReport(testPrisma, reportOf(kept))
    expect(second.every((r) => r.status === 'nothing-to-do')).toBe(true)
    expect(await fingerprint()).toBe(snapshot)
    expect(await testPrisma.recipeStep.count({ where: { recipeId: goulash.id } })).toBe(1) // no steps added twice
  })

  it('apply: never replaces a method that already exists', async () => {
    const { goulash } = await seedBook()
    await testPrisma.recipeStep.create({ data: { recipeId: goulash.id, order: 0, text: 'Ronen own step' } })
    const entry: ReportEntry = {
      recipeId: goulash.id, name: 'Goulash', action: 'enrich', reason: '', summary: '',
      changes: { steps: [{ text: 'Page step 1', timerSeconds: null }, { text: 'Page step 2', timerSeconds: null }] },
    }
    const [result] = await applyReport(testPrisma, reportOf([entry]))
    expect(result.status).toBe('nothing-to-do')
    expect((await testPrisma.recipeStep.findMany()).map((s) => s.text)).toEqual(['Ronen own step'])
  })

  it('apply: a step pointing at someone else\'s ingredient is refused', async () => {
    const { goulash, keeper } = await seedBook()
    const other = await testPrisma.ingredient.findFirst({ where: { recipeId: keeper.id } })
    const entry: ReportEntry = {
      recipeId: goulash.id, name: 'Goulash', action: 'enrich', reason: '', summary: '',
      changes: { steps: [{ text: `Add {ing:${other!.id}}`, timerSeconds: null }] },
    }
    const [result] = await applyReport(testPrisma, reportOf([entry]))
    expect(result.status).toBe('nothing-to-do')
    expect(await testPrisma.recipeStep.count()).toBe(0)
  })

  it('apply: skips an entry whose recipe was renamed since the report', async () => {
    const { fries } = await seedBook()
    await testPrisma.recipe.update({ where: { id: fries.id }, data: { name: 'Crispy Fries' } })
    const entry: ReportEntry = { recipeId: fries.id, name: 'Simple Fries', action: 'quick', reason: '', summary: '' }
    const [result] = await applyReport(testPrisma, reportOf([entry]))
    expect(result.status).toBe('skipped')
    expect(await testPrisma.recipe.findUnique({ where: { id: fries.id } })).toMatchObject({ kind: 'full' })
  })

  it('duplicate merge: needs approval, then re-points every meal-plan slot before deleting the copy', async () => {
    const { copy, keeper, plans } = await seedBook()
    const report = await buildBackfillPlan(testPrisma, planDeps(), { database: 'test', note: null, model: 'm' })
    const dup = report.entries.find((e) => e.action === 'duplicate')!
    expect(dup.approved).toBe(false)

    // Not approved: nothing happens, the copy and its meal-plan days are still there.
    const before = await fingerprint()
    const [skipped] = await applyReport(testPrisma, reportOf([dup]))
    expect(skipped.status).toBe('skipped')
    expect(await fingerprint()).toBe(before)

    // Approved: three plan days survive, now pointing at the keeper; the copy is gone.
    const [merged] = await applyReport(testPrisma, reportOf([{ ...dup, approved: true }]))
    expect(merged).toMatchObject({ status: 'applied' })
    expect(await testPrisma.recipe.findUnique({ where: { id: copy.id } })).toBeNull()
    const days = await testPrisma.mealPlan.findMany({ where: { id: { in: plans.map((p) => p.id) } } })
    expect(days).toHaveLength(3)
    expect(days.every((d) => d.proteinRecipeId === keeper.id)).toBe(true)
    expect(days.every((d) => d.carbRecipeId !== null)).toBe(true)

    // Re-run: already merged.
    const [again] = await applyReport(testPrisma, reportOf([{ ...dup, approved: true }]))
    expect(again.status).toBe('nothing-to-do')
    expect(await testPrisma.mealPlan.count()).toBe(3)
  })

  it('duplicate merge: refuses to delete anything when the recipe to keep is gone', async () => {
    const { copy, keeper } = await seedBook()
    const report = await buildBackfillPlan(testPrisma, planDeps(), { database: 'test', note: null, model: 'm' })
    const dup = report.entries.find((e) => e.action === 'duplicate')!
    await testPrisma.recipe.delete({ where: { id: keeper.id } }) // cascades its own plan row; the copy's rows stay
    const [result] = await applyReport(testPrisma, reportOf([{ ...dup, approved: true }]))
    expect(result.status).toBe('skipped')
    expect(await testPrisma.recipe.findUnique({ where: { id: copy.id } })).not.toBeNull()
    expect(await testPrisma.mealPlan.count({ where: { proteinRecipeId: copy.id } })).toBe(2)
  })

  describe('the command line', () => {
    const env = { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL, DATABASE_URL_UNPOOLED: process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL }
    const run = (args: string[]) => spawnSync('npx', ['tsx', 'scripts/rehaul/backfillRecipes.ts', ...args], { env: env as NodeJS.ProcessEnv, encoding: 'utf8' })

    it('refuses --apply without --i-have-a-backup, explains how to take one, and changes nothing', async () => {
      const { fries } = await seedBook()
      const dir = mkdtempSync(join(tmpdir(), 's07-'))
      const file = join(dir, 'report.json')
      writeFileSync(file, JSON.stringify(reportOf([{ recipeId: fries.id, name: 'Simple Fries', action: 'quick', reason: '', summary: '' }])))

      const result = run(['--apply', file])
      expect(result.status).toBe(1)
      expect(result.stderr).toMatch(/Refusing to apply/)
      expect(result.stderr).toMatch(/backup\/<YYYYMMDD>-S07/)
      expect(result.stderr).toMatch(/pg_dump/)
      expect(await testPrisma.recipe.findUnique({ where: { id: fries.id } })).toMatchObject({ kind: 'full' })
    })

    it('applies end to end with the confirmation flag, and a second run changes nothing', async () => {
      const { fries } = await seedBook()
      const dir = mkdtempSync(join(tmpdir(), 's07-'))
      const file = join(dir, 'report.json')
      writeFileSync(file, JSON.stringify(reportOf([{ recipeId: fries.id, name: 'Simple Fries', action: 'quick', reason: '', summary: '' }])))

      const first = run(['--apply', file, '--i-have-a-backup'])
      expect(first.status).toBe(0)
      expect(first.stdout).toMatch(/applied/)
      expect(await testPrisma.recipe.findUnique({ where: { id: fries.id } })).toMatchObject({ kind: 'quick' })

      const second = run(['--apply', file, '--i-have-a-backup'])
      expect(second.status).toBe(0)
      expect(second.stdout).toMatch(/nothing-to-do/)
    })
  })
})
