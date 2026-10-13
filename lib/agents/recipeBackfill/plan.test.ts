import { describe, it, expect, vi } from 'vitest'
import { buildBackfillPlan, type PlanDeps } from './plan'
import { renderMarkdown } from './report'
import type { RecipeDraft } from '@/lib/agents/recipeImporter/types'

let n = 0
function row(name: string, over: Record<string, unknown> = {}) {
  n++
  return {
    id: `id${n}`,
    name,
    kind: 'full',
    recipeUrl: null,
    servings: null,
    totalTimeMinutes: null,
    description: null,
    notes: null,
    prepTime: null,
    createdAt: new Date(2026, 0, n),
    structuredIngredients: [1, 2, 3].map((k) => ({ id: `ing${n}-${k}`, name: `i${k}`, quantity: null, unit: null, notes: null })),
    _count: { steps: 0 },
    ...over,
  }
}

function fakePrisma(recipes: ReturnType<typeof row>[], plans: Record<string, string | null>[] = []) {
  return {
    recipe: { findMany: vi.fn().mockResolvedValue(recipes) },
    mealPlan: { findMany: vi.fn().mockResolvedValue(plans) },
  } as any
}

const draft = (over: Partial<RecipeDraft> = {}): RecipeDraft => ({
  name: 'x', kind: 'full', description: null, servings: 4, totalTimeMinutes: 30, prepTime: null, sourceUrl: null, notes: null,
  ingredients: [], steps: [{ text: 'Cook.', timerSeconds: null }], proteinType: null, carbType: null, includesVegetables: false, ...over,
})

function deps(over: Partial<PlanDeps> = {}): PlanDeps {
  return {
    runImporter: vi.fn(async () => ({ runId: 'run1', ok: true, output: { draft: draft(), similarRecipes: [] } })),
    runTokens: vi.fn(async () => ({ inputTokens: 1000, outputTokens: 200 })),
    sleep: vi.fn(async () => {}),
    delayMs: 10,
    tokenBudget: 1_000_000,
    ...over,
  }
}
const opts = { database: 'localhost/test', note: 'SYNTHETIC', model: 'm' }

describe('buildBackfillPlan', () => {
  it('assigns each recipe one action and counts them', async () => {
    const book = [
      row('Pasta Bake', { recipeUrl: 'https://x.test/p' }),
      row('Simple Fries'),
      row("Shini's Soup"),
      row('Dup Salad', { recipeUrl: 'https://x.test/d', servings: 2 }),
      row('Dup Salad'),
    ]
    const report = await buildBackfillPlan(fakePrisma(book), deps(), opts)
    expect(report.summary).toEqual({ enrich: 2, quick: 1, leave: 1, duplicate: 1 })
    const byName = (name: string) => report.entries.filter((e) => e.name === name)
    expect(byName('Simple Fries')[0].action).toBe('quick')
    expect(byName("Shini's Soup")[0].reason).toMatch(/Family recipe/)
    expect(byName('Pasta Bake')[0]).toMatchObject({ action: 'enrich', runId: 'run1' })
    expect(report.tokens).toEqual({ inputTokens: 2000, outputTokens: 400, runs: 2 })
  })

  it('runs the agent only for recipes with links, and the duplicate copy gets no agent run', async () => {
    const book = [row('Dup', { recipeUrl: 'https://x.test/a', servings: 1 }), row('Dup', { recipeUrl: 'https://x.test/b' }), row('Plain')]
    const d = deps()
    await buildBackfillPlan(fakePrisma(book), d, opts)
    expect(d.runImporter).toHaveBeenCalledTimes(1)
  })

  it('proposes a merge that re-points meal-plan slots, never approved by default', async () => {
    const keeper = row('Sea Bass', { recipeUrl: 'https://x.test/s', servings: 2 })
    const copy = row('Sea Bass')
    const plans = [
      { lunchRecipeId: null, proteinRecipeId: copy.id, carbRecipeId: null, vegetableRecipeId: null },
      { lunchRecipeId: null, proteinRecipeId: copy.id, carbRecipeId: null, vegetableRecipeId: null },
      { lunchRecipeId: null, proteinRecipeId: keeper.id, carbRecipeId: null, vegetableRecipeId: null },
    ]
    const report = await buildBackfillPlan(fakePrisma([keeper, copy], plans), deps(), opts)
    const dup = report.entries.find((e) => e.action === 'duplicate')!
    expect(dup.recipeId).toBe(copy.id)
    expect(dup.merge).toMatchObject({ keeperId: keeper.id, repoint: { protein: 2, lunch: 0, carb: 0, vegetable: 0 } })
    expect(dup.approved).toBe(false)
    expect(dup.summary).toMatch(/re-point 2 meal-plan slots/)
    expect(report.entries.find((e) => e.recipeId === keeper.id)!.duplicateGroup).toBe('sea bass')
  })

  it('lists failed links as leave with the agent reason and run id', async () => {
    const d = deps({
      runImporter: vi.fn(async () => ({ runId: 'run9', ok: false, error: 'x', gaveUpReason: 'The page returned 404 not found.' })),
    })
    const report = await buildBackfillPlan(fakePrisma([row('Gone', { recipeUrl: 'https://x.test/404' })]), d, opts)
    expect(report.entries[0]).toMatchObject({ action: 'leave', reason: 'The page returned 404 not found.', runId: 'run9' })
  })

  it('a page with no method and nothing else to add is "leave: no method found"', async () => {
    const d = deps({
      runImporter: vi.fn(async () => ({ runId: 'r', ok: true, output: { draft: draft({ steps: [], servings: null, totalTimeMinutes: null }), similarRecipes: [] } })),
    })
    const report = await buildBackfillPlan(fakePrisma([row('Salad', { recipeUrl: 'https://x.test/salad' })]), d, opts)
    expect(report.entries[0]).toMatchObject({ action: 'leave' })
    expect(report.entries[0].reason).toMatch(/No method found/)
  })

  it('a page with no method but a servings count still enriches, and says there is no method', async () => {
    const d = deps({
      runImporter: vi.fn(async () => ({ runId: 'r', ok: true, output: { draft: draft({ steps: [] }), similarRecipes: [] } })),
    })
    const report = await buildBackfillPlan(fakePrisma([row('Salad', { recipeUrl: 'https://x.test/salad' })]), d, opts)
    expect(report.entries[0].action).toBe('enrich')
    expect(report.entries[0].changes!.steps).toBeUndefined()
    expect(report.entries[0].reason).toMatch(/no method found/)
  })

  it('stops starting agent runs when the token budget is used up and says so', async () => {
    const book = [1, 2, 3].map((k) => row(`R${k}`, { recipeUrl: `https://x.test/${k}` }))
    const d = deps({ tokenBudget: 1200 }) // each run uses 1200
    const report = await buildBackfillPlan(fakePrisma(book), d, opts)
    expect(d.runImporter).toHaveBeenCalledTimes(1)
    expect(report.budgetExceeded).toBe(true)
    expect(report.entries.filter((e) => e.reason.startsWith('Not checked'))).toHaveLength(2)
  })

  it('pauses between agent runs but not before the first', async () => {
    const book = [1, 2].map((k) => row(`R${k}`, { recipeUrl: `https://x.test/${k}` }))
    const d = deps()
    await buildBackfillPlan(fakePrisma(book), d, opts)
    expect(d.sleep).toHaveBeenCalledTimes(1)
    expect(d.sleep).toHaveBeenCalledWith(10)
  })

  it('treats a non-web link as leave without calling the agent', async () => {
    const d = deps()
    const report = await buildBackfillPlan(fakePrisma([row('Odd', { recipeUrl: 'see mum' })]), d, opts)
    expect(d.runImporter).not.toHaveBeenCalled()
    expect(report.entries[0].action).toBe('leave')
  })

  it('writes nothing to the database: only reads are used', async () => {
    const p = fakePrisma([row('A', { recipeUrl: 'https://x.test/a' })])
    await buildBackfillPlan(p, deps(), opts)
    expect(Object.keys(p.recipe)).toEqual(['findMany'])
    expect(Object.keys(p.mealPlan)).toEqual(['findMany'])
  })

  it('renders a markdown report with the summary and the synthetic note', async () => {
    const report = await buildBackfillPlan(fakePrisma([row('Simple Rice'), row('A', { recipeUrl: 'https://x.test/a' })]), deps(), opts)
    const md = renderMarkdown(report)
    expect(md).toMatch(/SYNTHETIC/)
    expect(md).toMatch(/\| quick \| 1 \|/)
    expect(md).toMatch(/\| enrich \| 1 \|/)
    expect(md).toMatch(/Simple Rice/)
    expect(md).toMatch(/`run1`/)
  })
})
