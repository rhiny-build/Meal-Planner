import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    dishType: {
      findMany: vi.fn().mockResolvedValue([
        { value: 'chicken', category: 'protein' },
        { value: 'rice', category: 'carb' },
      ]),
    },
  },
}))
vi.mock('../loop', () => ({ runAgent: vi.fn(async () => ({ runId: 'run_1', ok: true, output: {} })) }))

import { runAgent } from '../loop'
import { classifyImportInput, runRecipeImporter } from './index'

beforeEach(() => vi.clearAllMocks())

describe('classifyImportInput', () => {
  it('treats a lone http(s) URL as a url', () => {
    expect(classifyImportInput('  https://example.com/r?id=1 ')).toEqual({ url: 'https://example.com/r?id=1' })
  })
  it('treats anything else as a description, including text that contains a URL', () => {
    expect(classifyImportInput('my schnitzel: chicken, egg')).toEqual({ text: 'my schnitzel: chicken, egg' })
    expect(classifyImportInput('see https://example.com/r for it')).toEqual({ text: 'see https://example.com/r for it' })
    expect(classifyImportInput('ftp://example.com/r')).toEqual({ text: 'ftp://example.com/r' })
  })
})

describe('runRecipeImporter', () => {
  it('runs the loop with its tools, the dish types in the prompt and a turn limit', async () => {
    await runRecipeImporter({ url: 'https://example.com/r' })
    const params = vi.mocked(runAgent).mock.calls[0][0]
    expect(params.agent).toBe('recipe-importer')
    expect(params.trigger).toBe('manual')
    expect(params.tools.map((t) => t.name)).toEqual([
      'fetch_page',
      'find_similar_recipes',
      'cannot_import_recipe',
      'submit_recipe',
    ])
    expect(params.system).toContain('chicken')
    expect(params.system).toContain('rice')
    expect(params.userMessage).toContain('https://example.com/r')
    expect(params.maxTurns).toBeGreaterThan(0)
  })

  it('enrich mode: batch trigger, book copy in the message, no duplicate check, record of the recipe in the run input', async () => {
    await runRecipeImporter({ url: 'https://example.com/r' }, 'batch', {
      enrich: {
        recipeId: 'rec1',
        name: 'Goulash',
        servings: null,
        totalTimeMinutes: null,
        description: null,
        notes: null,
        hasSteps: false,
        ingredients: [{ id: 'ing1', name: 'beef', quantity: '1', unit: 'kg', notes: null }],
      },
    })
    const params = vi.mocked(runAgent).mock.calls[0][0]
    expect(params.trigger).toBe('batch')
    expect(params.tools.map((t) => t.name)).not.toContain('find_similar_recipes')
    expect(params.system).toMatch(/ENRICH MODE/)
    expect(params.userMessage).toContain('id ing1: 1 kg beef')
    expect(params.userMessage).toContain('no steps yet')
    expect(params.input).toMatchObject({ url: 'https://example.com/r', mode: 'enrich', recipeId: 'rec1' })
  })

  it('enrich mode needs a URL', async () => {
    await expect(
      runRecipeImporter({ text: 'x' }, 'batch', {
        enrich: { recipeId: 'r', name: 'n', servings: null, totalTimeMinutes: null, description: null, notes: null, hasSteps: false, ingredients: [] },
      })
    ).rejects.toThrow(/needs a URL/)
  })

  it('normal mode is unchanged by enrich support (no enrich text in the prompt)', async () => {
    await runRecipeImporter({ url: 'https://example.com/r' })
    expect(vi.mocked(runAgent).mock.calls[0][0].system).not.toMatch(/ENRICH MODE/)
  })

  it('tells the model never to invent a method', async () => {
    await runRecipeImporter({ text: 'toast' })
    const params = vi.mocked(runAgent).mock.calls[0][0]
    expect(params.system).toMatch(/Never invent a method/)
    expect(params.system).toMatch(/EMPTY steps list/)
    expect(params.userMessage).toContain('toast')
  })
})
