import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecipesClient from './RecipesClient'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

const suggestion = {
  name: 'Lemon Garlic Chicken Thighs',
  recipeUrl: 'https://example.com/lemon-chicken',
  ingredients: '8 chicken thighs\n3 tbsp olive oil',
  proteinType: 'chicken',
  carbType: '',
  prepTime: 'medium',
  tier: 'new',
  isLunchAppropriate: false,
}

const draft = {
  name: 'Lemon Garlic Chicken Thighs',
  kind: 'full',
  description: null,
  servings: 4,
  totalTimeMinutes: 55,
  prepTime: 'medium',
  sourceUrl: 'https://example.com/lemon-chicken',
  notes: null,
  ingredients: [{ key: 'i1', name: 'chicken thighs', quantity: '8', unit: null, amount: 8, notes: null }],
  steps: [{ text: 'Roast {ing:i1} for 40 minutes.', timerSeconds: 2400 }],
  proteinType: 'chicken',
  carbType: null,
  includesVegetables: false,
}

const json = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response)

const calls: { url: string; method: string; body: any }[] = []
const mockFetch = vi.fn((url: string, init?: RequestInit) => {
  calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : null })
  if (url === '/api/recipes') return json([])
  if (url === '/api/recipes/discover') return json({ recipes: [suggestion] })
  if (url === '/api/recipes/import') return json({ runId: 'run_1', draft, similarRecipes: [] })
  if (url === '/api/recipes/import/save') return json({ id: 'new1' })
  if (url === '/api/recipes/create') return json({ id: 'wrong' })
  return json({}, 404)
})

beforeEach(() => {
  calls.length = 0
  mockFetch.mockClear()
  vi.stubGlobal('fetch', mockFetch)
})

async function openInspireAndSearch() {
  const user = userEvent.setup()
  render(
    <RecipesClient proteinOptions={[]} carbOptions={[]} proteinFilterOptions={[]} carbFilterOptions={[]} />
  )
  await user.click(await screen.findByRole('button', { name: 'Inspire Me' }))
  await user.type(screen.getByPlaceholderText(/quick chicken/), 'chicken')
  await user.click(screen.getByRole('button', { name: 'Search' }))
  await screen.findByRole('button', { name: 'Accept' })
  return user
}

/**
 * Regression: accepting an Inspire Me suggestion used to POST the thin suggestion (name, URL,
 * ingredient text) straight to /api/recipes/create, so the saved recipe had no method or
 * servings. It must run the suggestion's URL through the importer and show the review screen.
 */
describe('Inspire Me: accepting a suggestion', () => {
  it('imports the suggestion URL with the importer, shows the review screen, and saves from there', async () => {
    const user = await openInspireAndSearch()
    await user.click(screen.getByRole('button', { name: 'Accept' }))

    await screen.findByRole('heading', { name: 'Review imported recipe' })
    const importCall = calls.find((c) => c.url === '/api/recipes/import')
    expect(importCall?.body).toEqual({ input: 'https://example.com/lemon-chicken' })
    expect(calls.some((c) => c.url === '/api/recipes/create')).toBe(false)
    expect(screen.getByText(/Roast 8 chicken thighs/)).toBeInTheDocument() // method came in

    await user.click(screen.getByRole('button', { name: 'Save to recipe book' }))
    await waitFor(() => expect(screen.getByText('Added!')).toBeInTheDocument())
    expect(calls.filter((c) => c.url === '/api/recipes/import/save')).toHaveLength(1)
  })

  it('shows progress with an estimate while searching and while importing', async () => {
    let finishSearch: (v: Response) => void = () => {}
    let finishImport: (v: Response) => void = () => {}
    const base = mockFetch.getMockImplementation()!
    mockFetch.mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/recipes/discover') return new Promise<Response>((r) => (finishSearch = r))
      if (url === '/api/recipes/import') return new Promise<Response>((r) => (finishImport = r))
      return base(url, init)
    })
    const user = userEvent.setup()
    render(
      <RecipesClient proteinOptions={[]} carbOptions={[]} proteinFilterOptions={[]} carbFilterOptions={[]} />
    )
    await user.click(await screen.findByRole('button', { name: 'Inspire Me' }))
    await user.type(screen.getByPlaceholderText(/quick chicken/), 'chicken')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByTestId('ai-progress')).toHaveTextContent('Searching the web for recipes')
    expect(screen.getByTestId('ai-progress-note')).toHaveTextContent('Usually takes 8-30 seconds.')

    finishSearch(await json({ recipes: [suggestion] }))
    await waitFor(() => expect(screen.queryByTestId('ai-progress')).not.toBeInTheDocument())
    await user.click(await screen.findByRole('button', { name: 'Accept' }))
    expect(await screen.findByTestId('ai-progress')).toHaveTextContent('Reading the recipe')

    finishImport(await json({ runId: 'run_1', draft, similarRecipes: [] }))
    await screen.findByRole('heading', { name: 'Review imported recipe' })
    expect(screen.queryByTestId('ai-progress')).not.toBeInTheDocument()
    mockFetch.mockImplementation(base)
  })

  it('does not mark the suggestion as added when the review is discarded', async () => {
    const user = await openInspireAndSearch()
    await user.click(screen.getByRole('button', { name: 'Accept' }))
    await screen.findByRole('heading', { name: 'Review imported recipe' })
    await user.click(screen.getByRole('button', { name: 'Discard' }))

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Review imported recipe' })).not.toBeInTheDocument()
    )
    expect(screen.queryByText('Added!')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
    expect(calls.some((c) => c.url === '/api/recipes/import/save')).toBe(false)
  })
})
