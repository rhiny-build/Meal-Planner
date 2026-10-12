import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/agents/recipeImporter', () => ({
  classifyImportInput: (s: string) => ({ text: s }),
  runRecipeImporter: vi.fn(),
}))
vi.mock('@/lib/agents/recipeImporter/saveDraft', () => ({ saveRecipeDraft: vi.fn() }))

import { runRecipeImporter } from '@/lib/agents/recipeImporter'
import { saveRecipeDraft } from '@/lib/agents/recipeImporter/saveDraft'
import { POST as importPost } from './route'
import { POST as savePost } from './save/route'

const req = (url: string, body: unknown) =>
  new NextRequest(`http://localhost${url}`, { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')
})

describe('POST /api/recipes/import', () => {
  it('rejects empty and over-long input', async () => {
    expect((await importPost(req('/api/recipes/import', { input: '  ' }))).status).toBe(400)
    expect((await importPost(req('/api/recipes/import', { input: 'x'.repeat(8001) }))).status).toBe(400)
    expect(runRecipeImporter).not.toHaveBeenCalled()
  })

  it('returns the draft and the run id', async () => {
    vi.mocked(runRecipeImporter).mockResolvedValue({
      runId: 'run_1',
      ok: true,
      output: { draft: { name: 'X' } as any, similarRecipes: [] },
    })
    const res = await importPost(req('/api/recipes/import', { input: 'toast' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ runId: 'run_1', draft: { name: 'X' }, similarRecipes: [] })
  })

  it('answers 502 with the run id when the agent fails', async () => {
    vi.mocked(runRecipeImporter).mockResolvedValue({ runId: 'run_2', ok: false, error: 'No final answer after 8 turns' })
    const res = await importPost(req('/api/recipes/import', { input: 'toast' }))
    expect(res.status).toBe(502)
    expect(await res.json()).toMatchObject({ runId: 'run_2' })
  })

  it('says so when the API key is missing', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const res = await importPost(req('/api/recipes/import', { input: 'toast' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).toContain('API key')
  })
})

describe('POST /api/recipes/import/save', () => {
  it('saves a draft and returns 201', async () => {
    vi.mocked(saveRecipeDraft).mockResolvedValue({ id: 'r1' } as any)
    const res = await savePost(req('/api/recipes/import/save', { draft: { name: 'X' } }))
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'r1' })
  })

  it('needs a draft, and returns validation errors as 400', async () => {
    expect((await savePost(req('/api/recipes/import/save', {}))).status).toBe(400)
    vi.mocked(saveRecipeDraft).mockRejectedValue(new Error('name is required'))
    const res = await savePost(req('/api/recipes/import/save', { draft: {} }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('name is required')
  })
})
