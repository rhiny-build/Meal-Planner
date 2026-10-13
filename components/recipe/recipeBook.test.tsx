import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecipeCard from '@/components/RecipeCard'
import RecipeEditor from './RecipeEditor'
import type { RecipeWithIngredients } from '@/types'

function recipe(overrides: Partial<RecipeWithIngredients> = {}): RecipeWithIngredients {
  return {
    id: 'r1',
    name: 'Beef Keema',
    ingredients: '',
    proteinType: null,
    carbType: null,
    vegetableType: null,
    recipeUrl: null,
    isLunchAppropriate: false,
    prepTime: 'medium',
    tier: 'favorite',
    kind: 'full',
    servings: 4,
    description: null,
    totalTimeMinutes: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    structuredIngredients: [
      {
        id: 'i1',
        recipeId: 'r1',
        name: 'beef mince',
        quantity: '500',
        unit: 'g',
        amount: 500,
        notes: null,
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    steps: [],
    ...overrides,
  }
}

describe('RecipeCard book features', () => {
  it('shows whether there is a method', () => {
    const steps = [
      { id: 's1', recipeId: 'r1', order: 0, text: 'Fry', timerSeconds: null, createdAt: new Date(), updatedAt: new Date() },
    ] as any
    const { rerender } = render(<RecipeCard recipe={recipe({ steps })} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('method-indicator')).toHaveTextContent('Method · 1 step')
    rerender(<RecipeCard recipe={recipe()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('method-indicator')).toHaveTextContent('No method')
  })

  it('renders quick recipes compactly without an ingredient list', () => {
    render(<RecipeCard recipe={recipe({ kind: 'quick', name: 'Simple Fries' })} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('recipe-card')).toHaveAttribute('data-kind', 'quick')
    expect(screen.getByText('Quick')).toBeInTheDocument()
    expect(screen.queryByText(/Ingredients:/)).toBeNull()
  })

  it('links the name to the recipe page', () => {
    render(<RecipeCard recipe={recipe()} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByRole('link', { name: /^Beef Keema/ })).toHaveAttribute('href', '/recipes/r1')
  })
})

describe('RecipeEditor', () => {
  const opts = [{ value: '', label: 'None' }]

  it('submits ingredient ids, kind and steps with a timer and a token', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <RecipeEditor recipe={recipe()} onSubmit={onSubmit} onCancel={vi.fn()} proteinOptions={opts} carbOptions={opts} />
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Add step' }))
    fireEvent.change(screen.getByLabelText('Text of step 1'), {
      target: { value: 'Brown the {beef mince}' },
    })
    await user.type(screen.getByLabelText('Timer minutes for step 1'), '10')
    await user.click(screen.getByRole('button', { name: 'Update Recipe' }))

    const data = onSubmit.mock.calls[0][0]
    expect(data.structuredIngredients[0]).toMatchObject({ id: 'i1', name: 'beef mince' })
    expect(data.steps).toEqual([{ text: 'Brown the {ing:i1}', timerSeconds: 600 }])
    expect(data.kind).toBe('full')
    expect(data.servings).toBe(4)
  })

  it('needs at least one ingredient and has no required method', async () => {
    const onSubmit = vi.fn()
    render(
      <RecipeEditor recipe={recipe({ structuredIngredients: [] })} onSubmit={onSubmit} onCancel={vi.fn()} proteinOptions={opts} carbOptions={opts} />
    )
    const user = userEvent.setup()
    expect(screen.getByText('No steps. That is fine.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Update Recipe' }))
    expect(screen.getByRole('alert')).toHaveTextContent('at least one ingredient')
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
