import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecipeImportModal from './RecipeImportModal'

const draftResponse = {
  runId: 'run_1',
  draft: {
    name: 'Schnitzel',
    kind: 'full',
    description: null,
    servings: 4,
    totalTimeMinutes: 30,
    prepTime: 'medium',
    sourceUrl: null,
    notes: null,
    ingredients: [
      { key: 'i1', name: 'chicken breast', quantity: '2', unit: null, amount: 2, notes: 'flattened' },
      { key: 'i2', name: 'breadcrumbs', quantity: '1 1/2', unit: 'cups', amount: 1.5, notes: null },
    ],
    steps: [{ text: 'Coat {ing:i1} in {ing:i2}.', timerSeconds: 240 }],
    proteinType: 'chicken',
    carbType: null,
    includesVegetables: false,
  },
  similarRecipes: [{ id: 'x', name: 'Chicken Schnitzel', kind: 'full', recipeUrl: null }],
}

const ok = (body: unknown, status = 200) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response)

const mockFetch = vi.fn()
beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

describe('RecipeImportModal', () => {
  it('imports, shows the draft with readable steps and a duplicate warning, then saves', async () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    mockFetch.mockReturnValueOnce(ok(draftResponse)).mockReturnValueOnce(ok({ id: 'r1' }, 201))
    const user = userEvent.setup()
    render(<RecipeImportModal onSaved={onSaved} onClose={onClose} />)

    await user.type(screen.getByLabelText('Recipe URL or description'), 'my schnitzel')
    await user.click(screen.getByRole('button', { name: 'Import' }))

    expect(await screen.findByText('Schnitzel')).toBeInTheDocument()
    expect(screen.getByText(/Coat 2 chicken breast in 1.5 cups breadcrumbs/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Chicken Schnitzel')
    expect(mockFetch.mock.calls[0][0]).toBe('/api/recipes/import')
    expect(JSON.parse(mockFetch.mock.calls[0][1].body)).toEqual({ input: 'my schnitzel' })

    await user.click(screen.getByRole('button', { name: 'Save to recipe book' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(mockFetch.mock.calls[1][0]).toBe('/api/recipes/import/save')
    expect(onSaved).toHaveBeenCalled()
  })

  it('says so when there is no method', async () => {
    mockFetch.mockReturnValueOnce(ok({ ...draftResponse, draft: { ...draftResponse.draft, steps: [] }, similarRecipes: [] }))
    const user = userEvent.setup()
    render(<RecipeImportModal onSaved={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByLabelText('Recipe URL or description'), 'toast')
    await user.click(screen.getByRole('button', { name: 'Import' }))
    expect(await screen.findByText(/No method found/)).toBeInTheDocument()
  })

  it('shows an error with a link to the failed run', async () => {
    mockFetch.mockReturnValueOnce(ok({ error: 'The import did not finish.', runId: 'run_9' }, 502))
    const user = userEvent.setup()
    render(<RecipeImportModal onSaved={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByLabelText('Recipe URL or description'), 'toast')
    await user.click(screen.getByRole('button', { name: 'Import' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('did not finish')
    expect(screen.getByRole('link', { name: 'See what happened' })).toHaveAttribute('href', '/agent-runs/run_9')
  })

  it('asks for input before calling the API', async () => {
    const user = userEvent.setup()
    render(<RecipeImportModal onSaved={vi.fn()} onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Import' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
