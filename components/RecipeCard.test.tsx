/**
 * Component Tests for RecipeCard
 *
 * React component testing focuses on:
 * - Does the component render correctly with given props?
 * - Do user interactions trigger the right callbacks?
 * - Does the component handle edge cases (missing data, etc.)?
 *
 * The card is deliberately short: name, kind, time, whether it has a method,
 * a Cook shortcut and an Edit/Delete menu. No ingredient lists.
 *
 * TESTING PHILOSOPHY:
 * Test the component like a user would interact with it.
 * Don't test implementation details (internal state, method names).
 *
 * KEY TESTING LIBRARY CONCEPTS:
 * - render(): Mounts the component in a virtual DOM
 * - screen: Query methods to find elements
 * - userEvent: Simulates user interactions (clicks, typing)
 * - getByText/getByRole: Find elements by accessible attributes
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RecipeCard from '@/components/RecipeCard'
import type { RecipeWithIngredients } from '@/types'

/**
 * Create a complete mock Recipe object
 *
 * This factory function creates a valid Recipe with sensible defaults.
 * You can override any property when needed for specific test cases.
 */
function createMockRecipe(overrides: Partial<RecipeWithIngredients> = {}): RecipeWithIngredients {
  return {
    id: 'test-recipe-id',
    name: 'Test Recipe',
    ingredients: 'ingredient 1\ningredient 2\ningredient 3',
    proteinType: 'chicken',
    carbType: 'rice',
    vegetableType: null,
    recipeUrl: null,
    isLunchAppropriate: false,
    prepTime: 'quick',
    tier: 'favorite',
    kind: 'full',
    servings: null,
    description: null,
    totalTimeMinutes: null,
    notes: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    structuredIngredients: [],
    ...overrides,
  }
}

describe('RecipeCard', () => {
  it('should show the name, kind and time', () => {
    const recipe = createMockRecipe({ name: 'Grilled Chicken', totalTimeMinutes: 40 })

    render(<RecipeCard recipe={recipe} onEdit={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText('Grilled Chicken')).toBeInTheDocument()
    expect(screen.getByText('Full')).toBeInTheDocument()
    expect(screen.getByText('40 min')).toBeInTheDocument()
  })

  it('should fall back to the prep bucket when there is no exact time', () => {
    render(<RecipeCard recipe={createMockRecipe({ prepTime: 'medium' })} onEdit={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText('30–60 min')).toBeInTheDocument()
  })

  it('should say whether the recipe has a method', () => {
    const { rerender } = render(
      <RecipeCard recipe={createMockRecipe()} onEdit={vi.fn()} onDelete={vi.fn()} />
    )
    expect(screen.getByTestId('method-indicator')).toHaveTextContent('No method')

    const steps = [
      { id: 's1', recipeId: 'x', order: 0, text: 'Fry', timerSeconds: null, createdAt: new Date(), updatedAt: new Date() },
      { id: 's2', recipeId: 'x', order: 1, text: 'Serve', timerSeconds: null, createdAt: new Date(), updatedAt: new Date() },
    ]
    rerender(<RecipeCard recipe={createMockRecipe({ steps })} onEdit={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByTestId('method-indicator')).toHaveTextContent('Method · 2 steps')
  })

  it('should not list ingredients', () => {
    const recipe = createMockRecipe({ ingredients: 'chicken breast\ngarlic\nolive oil' })

    render(<RecipeCard recipe={recipe} onEdit={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.queryByText(/chicken breast/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Ingredients/)).not.toBeInTheDocument()
  })

  it('should open the recipe page from the card and cook mode from Cook', () => {
    const recipe = createMockRecipe({ id: 'abc', name: 'Grilled Chicken' })

    render(<RecipeCard recipe={recipe} onEdit={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByRole('link', { name: /^Grilled Chicken/ })).toHaveAttribute('href', '/recipes/abc')
    expect(screen.getByRole('link', { name: 'Cook Grilled Chicken' })).toHaveAttribute('href', '/recipes/abc/cook')
  })

  it('should call onEdit with the recipe when Edit is clicked', async () => {
    const recipe = createMockRecipe()
    const onEdit = vi.fn()
    const user = userEvent.setup()

    render(<RecipeCard recipe={recipe} onEdit={onEdit} onDelete={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /edit/i }))

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith(recipe)
  })

  it('should call onDelete with the recipe id when Delete is clicked', async () => {
    const onDelete = vi.fn()
    const user = userEvent.setup()

    render(<RecipeCard recipe={createMockRecipe({ id: 'recipe-to-delete' })} onEdit={vi.fn()} onDelete={onDelete} />)
    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('recipe-to-delete')
  })

  it('should render a recipe with every optional field empty', () => {
    const recipe = createMockRecipe({ proteinType: null, carbType: null, prepTime: null })

    render(<RecipeCard recipe={recipe} onEdit={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText('Test Recipe')).toBeInTheDocument()
  })
})
