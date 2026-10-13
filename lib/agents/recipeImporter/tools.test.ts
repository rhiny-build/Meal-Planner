import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: { findMany: vi.fn() },
    dishType: { findMany: vi.fn() },
  },
}))
vi.mock('./safeFetch', () => ({ safeFetchHtml: vi.fn() }))

import { prisma } from '@/lib/prisma'
import { safeFetchHtml } from './safeFetch'
import { buildDraft, createImporterTools, fetchPage, findSimilarRecipes } from './tools'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.dishType.findMany).mockResolvedValue([
    { value: 'chicken', category: 'protein' },
    { value: 'fish', category: 'protein' },
    { value: 'rice', category: 'carb' },
  ] as any)
})

describe('fetch_page', () => {
  it('returns the JSON-LD recipe when the page has one', async () => {
    vi.mocked(safeFetchHtml).mockResolvedValue({
      finalUrl: 'https://x.test/r',
      html: '<script type="application/ld+json">{"@type":"Recipe","name":"P","recipeIngredient":["1 egg"]}</script>',
    })
    const result = await fetchPage({ url: 'https://x.test/r' })
    expect(result).toMatchObject({ source: 'json-ld', url: 'https://x.test/r', recipe: { name: 'P' } })
  })

  it('returns visible text when there is no JSON-LD', async () => {
    vi.mocked(safeFetchHtml).mockResolvedValue({ finalUrl: 'https://x.test/r', html: '<h1>Soup</h1><p>Boil it</p>' })
    const result = await fetchPage({ url: 'https://x.test/r' })
    expect(result).toMatchObject({ source: 'page-text', text: 'Soup\nBoil it' })
  })

  it('needs a url and passes fetch errors on', async () => {
    await expect(fetchPage({})).rejects.toThrow('url is required')
    vi.mocked(safeFetchHtml).mockRejectedValue(new Error('The page returned HTTP 403'))
    await expect(fetchPage({ url: 'https://x.test' })).rejects.toThrow('403')
  })
})

describe('find_similar_recipes', () => {
  it('ranks by shared words and drops weak matches', async () => {
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([
      { id: '1', name: 'Chicken Schnitzel', kind: 'full', recipeUrl: null },
      { id: '2', name: 'Chicken Curry Special Deluxe', kind: 'full', recipeUrl: null },
      { id: '3', name: 'Schnitzel', kind: 'quick', recipeUrl: 'https://x.test' },
    ] as any)
    const { matches } = await findSimilarRecipes({ name: 'My chicken schnitzel' })
    expect(matches.map((m) => m.id)).toEqual(['1', '3'])
  })

  it('searches case-insensitively on each meaningful word', async () => {
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([])
    await findSimilarRecipes({ name: 'The Best Lemon Chicken' })
    const where = vi.mocked(prisma.recipe.findMany).mock.calls[0][0]!.where as any
    expect(where.OR.map((c: any) => c.name.contains)).toEqual(['lemon', 'chicken'])
    expect(where.OR[0].name.mode).toBe('insensitive')
  })

  it('returns nothing for a name with no meaningful words, and needs a name', async () => {
    expect((await findSimilarRecipes({ name: 'the' })).matches).toEqual([])
    expect(prisma.recipe.findMany).not.toHaveBeenCalled()
    await expect(findSimilarRecipes({ name: ' ' })).rejects.toThrow('name is required')
  })
})

const validRecipe = () => ({
  name: ' Schnitzel ',
  kind: 'full',
  description: 'Crispy',
  servings: 4,
  totalTimeMinutes: 30,
  prepTime: 'medium',
  notes: null,
  ingredients: [
    { key: 'i1', name: 'chicken breast', quantity: '2', unit: null, notes: 'flattened' },
    { key: 'i2', name: 'flour', quantity: '1 1/2', unit: 'cups', notes: null },
    { key: 'i3', name: 'salt', quantity: 'a pinch', unit: null, notes: null },
    { key: 'i4', name: 'oil', quantity: null, unit: null, notes: null },
  ],
  steps: [
    { text: 'Fry {ing:i1} for 4 minutes a side.', timerSeconds: 240 },
    { text: 'Season with {ing:i3}.', timerSeconds: null },
  ],
  proteinType: 'chicken',
  carbType: null,
  includesVegetables: false,
})

describe('submit_recipe (buildDraft)', () => {
  it('builds a draft, computing amounts itself and filling the source url', async () => {
    const draft = await buildDraft(validRecipe(), 'https://x.test/r')
    expect(draft.name).toBe('Schnitzel')
    expect(draft.sourceUrl).toBe('https://x.test/r')
    expect(draft.ingredients.map((i) => [i.quantity, i.unit, i.amount])).toEqual([
      ['2', null, 2],
      ['1 1/2', 'cups', 1.5],
      ['a pinch', null, null],
      [null, null, null],
    ])
    expect(draft.steps).toEqual([
      { text: 'Fry {ing:i1} for 4 minutes a side.', timerSeconds: 240 },
      { text: 'Season with {ing:i3}.', timerSeconds: null },
    ])
    expect(draft.proteinType).toBe('chicken')
  })

  it('accepts a recipe with no steps (no method is a valid result)', async () => {
    const draft = await buildDraft({ ...validRecipe(), steps: [] }, null)
    expect(draft.steps).toEqual([])
    expect(draft.sourceUrl).toBeNull()
  })

  it('rejects problems with a message the model can act on', async () => {
    await expect(buildDraft({ ...validRecipe(), name: ' ' }, null)).rejects.toThrow('name is required')
    await expect(buildDraft({ ...validRecipe(), kind: 'huge' }, null)).rejects.toThrow('kind')
    await expect(buildDraft({ ...validRecipe(), ingredients: [] }, null)).rejects.toThrow('at least one ingredient')
    await expect(
      buildDraft({ ...validRecipe(), steps: [{ text: 'Add {ing:zzz}', timerSeconds: null }] }, null)
    ).rejects.toThrow('unknown ingredient key "zzz"')
    await expect(
      buildDraft({ ...validRecipe(), steps: [{ text: 'Add {ing:}', timerSeconds: null }] }, null)
    ).rejects.toThrow('malformed')
    await expect(buildDraft({ ...validRecipe(), proteinType: 'unicorn' }, null)).rejects.toThrow('chicken, fish')
    await expect(buildDraft({ ...validRecipe(), carbType: 'pasta' }, null)).rejects.toThrow('rice')
  })

  it('rejects duplicate or badly formed ingredient keys', async () => {
    const dup = validRecipe()
    dup.ingredients[1].key = 'i1'
    await expect(buildDraft(dup, null)).rejects.toThrow('unique')
    const bad = validRecipe()
    bad.ingredients[0].key = 'i 1'
    await expect(buildDraft(bad, null)).rejects.toThrow('letters')
  })

  it('cleans odd numbers: bad timers and servings become null', async () => {
    const raw = validRecipe()
    raw.steps[0].timerSeconds = -5
    raw.servings = 0
    const draft = await buildDraft(raw, null)
    expect(draft.steps[0].timerSeconds).toBeNull()
    expect(draft.servings).toBeNull()
  })
})

describe('cannot_import_recipe', () => {
  it('returns the reason, with a fallback', async () => {
    const tool = createImporterTools({ sourceUrl: null }).find((t) => t.name === 'cannot_import_recipe')!
    expect(await tool.handler({ reason: ' The page could not be fetched ' })).toEqual({ reason: 'The page could not be fetched' })
    expect(await tool.handler({})).toEqual({ reason: 'No recipe found' })
  })
})

describe('createImporterTools', () => {
  it('offers the four tools; submit_recipe ends the run and cannot_import_recipe gives up', () => {
    const tools = createImporterTools({ sourceUrl: null })
    expect(tools.find((t) => t.name === 'cannot_import_recipe')!.givesUp).toBe(true)
    expect(tools.map((t) => [t.name, !!t.endsRun])).toEqual([
      ['fetch_page', false],
      ['find_similar_recipes', false],
      ['cannot_import_recipe', false],
      ['submit_recipe', true],
    ])
  })

  it('submit_recipe returns the draft plus the duplicates found earlier, without saving', async () => {
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([
      { id: '1', name: 'Chicken Schnitzel', kind: 'full', recipeUrl: null },
    ] as any)
    const tools = createImporterTools({ sourceUrl: 'https://x.test/r' })
    await tools.find((t) => t.name === 'find_similar_recipes')!.handler({ name: 'Chicken schnitzel' })
    const result: any = await tools.find((t) => t.name === 'submit_recipe')!.handler(validRecipe())

    expect(result.draft.sourceUrl).toBe('https://x.test/r')
    expect(result.similarRecipes.map((r: any) => r.id)).toEqual(['1'])
    // the importer never writes recipes
    expect(Object.keys(prisma.recipe)).toEqual(['findMany'])
  })
})
