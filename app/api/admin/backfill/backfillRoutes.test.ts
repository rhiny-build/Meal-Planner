import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const planBackfillRecipe = vi.fn()
const applyBackfillEntry = vi.fn()
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/agents/recipeBackfill/adminSteps', () => ({
  listBackfillRecipes: vi.fn(async () => [{ id: 'a', name: 'A' }]),
  planBackfillRecipe: (...args: unknown[]) => planBackfillRecipe(...args),
  applyBackfillEntry: (...args: unknown[]) => applyBackfillEntry(...args),
}))

import { GET as listRecipes } from './recipes/route'
import { POST as planRecipe } from './plan/route'
import { POST as applyRecipe } from './apply/route'

const post = (body: unknown) =>
  new NextRequest('http://localhost/api', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  planBackfillRecipe.mockReset()
  applyBackfillEntry.mockReset()
  process.env.ANTHROPIC_API_KEY = 'test'
})

describe('GET /api/admin/backfill/recipes', () => {
  it('lists the recipes', async () => {
    expect(await (await listRecipes()).json()).toEqual({ recipes: [{ id: 'a', name: 'A' }] })
  })
})

describe('POST /api/admin/backfill/plan', () => {
  it('needs a recipeId', async () => {
    expect((await planRecipe(post({}))).status).toBe(400)
  })

  it('reports a missing API key', async () => {
    delete process.env.ANTHROPIC_API_KEY
    expect((await planRecipe(post({ recipeId: 'a' }))).status).toBe(500)
  })

  it('answers 404 for a recipe that is gone', async () => {
    planBackfillRecipe.mockResolvedValue(null)
    expect((await planRecipe(post({ recipeId: 'a' }))).status).toBe(404)
  })

  it('returns the row, tokens and cost for one recipe', async () => {
    const result = { entry: { recipeId: 'a', action: 'leave' }, usage: { inputTokens: 1 }, estimatedCostUsd: 0.001 }
    planBackfillRecipe.mockResolvedValue(result)
    const response = await planRecipe(post({ recipeId: 'a' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(result)
  })
})

describe('POST /api/admin/backfill/apply', () => {
  it('refuses a malformed entry without touching the database', async () => {
    expect((await applyRecipe(post({ entry: { action: 'enrich' } }))).status).toBe(400)
    expect(applyBackfillEntry).not.toHaveBeenCalled()
  })

  it('applies a valid entry and returns the outcome', async () => {
    applyBackfillEntry.mockResolvedValue({ status: 'applied', detail: 'kind set to quick' })
    const response = await applyRecipe(post({ entry: { recipeId: 'a', name: 'A', action: 'quick', reason: '', summary: '' } }))
    expect(await response.json()).toEqual({ status: 'applied', detail: 'kind set to quick' })
  })

  it('answers 500 when applying failed', async () => {
    applyBackfillEntry.mockResolvedValue({ status: 'failed', detail: 'boom' })
    const response = await applyRecipe(post({ entry: { recipeId: 'a', name: 'A', action: 'quick', reason: '', summary: '' } }))
    expect(response.status).toBe(500)
  })
})
