/**
 * Component Tests for RecipeCard
 *
 * React component testing focuses on:
 * - Does the component render correctly with given props?
 * - Do user interactions trigger the right callbacks?
 * - Does the component handle edge cases (missing data, etc.)?
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
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    structuredIngredients: [],
    ...overrides,
  }
}

describe('RecipeCard', () => {
  /**
   * Test 1: Basic Rendering
   *
   * The most fundamental test - does the component render at all?
   * Check that essential information is displayed.
   */
  it('should render recipe name and tier badge', () => {
    // Arrange: Create mock data and callback functions
    const recipe = createMockRecipe({ name: 'Grilled Chicken' })
    const onEdit = vi.fn()
    const onDelete = vi.fn()

    // Act: Render the component
    render(<RecipeCard recipe={recipe} onEdit={onEdit} onDelete={onDelete} />)

    // Assert: Check the content is visible
    // getByText throws an error if element isn't found (fail-fast)
    expect(screen.getByText('Grilled Chicken')).toBeInTheDocument()
    expect(screen.getByText('Favorite')).toBeInTheDocument()
  })

  /**
   * Test 2: Displaying Recipe Details
   *
   * Verify that all the recipe information is shown correctly.
   */
  it('should display protein type, carb type, and prep time', () => {
    // Arrange
    const recipe = createMockRecipe({
      proteinType: 'fish',
      carbType: 'pasta',
      prepTime: 'medium',
    })

    // Act
    render(
      <RecipeCard recipe={recipe} onEdit={vi.fn()} onDelete={vi.fn()} />
    )

    // Assert: Check each detail is rendered
    // Using regex for partial matching when needed
    expect(screen.getByText('fish')).toBeInTheDocument()
    expect(screen.getByText('pasta')).toBeInTheDocument()
    expect(screen.getByText(/Medium/)).toBeInTheDocument()
  })

  /**
   * Test 3: Ingredients Display
   *
   * Verify the ingredients list is shown.
   *
   * NOTE: When text contains newlines or is split across elements,
   * use a function matcher or regex instead of exact string matching.
   */
  it('should display ingredients', () => {
    // Arrange
    const recipe = createMockRecipe({
      ingredients: 'chicken breast\ngarlic\nolive oil',
    })

    // Act
    render(
      <RecipeCard recipe={recipe} onEdit={vi.fn()} onDelete={vi.fn()} />
    )

    // Assert: Use a function matcher for text with newlines
    // The function receives the text content and element, returns true if matches
    expect(
      screen.getByText((content) => content.includes('chicken breast'))
    ).toBeInTheDocument()
  })

  /**
   * Test 4: User Interaction - Edit Button
   *
   * userEvent simulates real user behavior (clicking, typing).
   * We use vi.fn() to create mock functions and verify they're called.
   */
  it('should call onEdit with recipe when Edit button is clicked', async () => {
    // Arrange
    const recipe = createMockRecipe()
    const onEdit = vi.fn() // Mock function to track calls
    const onDelete = vi.fn()

    // userEvent.setup() creates a user instance for simulating interactions
    const user = userEvent.setup()

    // Act
    render(<RecipeCard recipe={recipe} onEdit={onEdit} onDelete={onDelete} />)

    // Find the Edit button and click it
    // getByRole is preferred - it's accessible and resilient to text changes
    const editButton = screen.getByRole('button', { name: /edit/i })
    await user.click(editButton)

    // Assert: Verify the callback was called with the recipe
    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith(recipe)
  })

  /**
   * Test 5: User Interaction - Delete Button
   */
  it('should call onDelete with recipe id when Delete button is clicked', async () => {
    // Arrange
    const recipe = createMockRecipe({ id: 'recipe-to-delete' })
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const user = userEvent.setup()

    // Act
    render(<RecipeCard recipe={recipe} onEdit={onEdit} onDelete={onDelete} />)

    const deleteButton = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteButton)

    // Assert
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('recipe-to-delete')
  })

  /**
   * Test 6: Handling Nullable Fields
   *
   * Test edge cases where optional fields are null.
   * The component should handle this gracefully (not crash).
   */
  it('should handle recipe with null protein type', () => {
    // Arrange: Recipe without protein type
    const recipe = createMockRecipe({
      proteinType: null,
      carbType: 'rice',
    })

    // Act: Should not throw an error
    render(
      <RecipeCard recipe={recipe} onEdit={vi.fn()} onDelete={vi.fn()} />
    )

    // Assert: Component renders without the Protein section
    expect(screen.queryByText('Protein:')).not.toBeInTheDocument()
    expect(screen.getByText('rice')).toBeInTheDocument()
  })

  it('should handle recipe with all nullable fields as null', () => {
    // Arrange: Minimal recipe
    const recipe = createMockRecipe({
      proteinType: null,
      carbType: null,
      prepTime: null,
    })

    // Act: Should render without crashing
    render(
      <RecipeCard recipe={recipe} onEdit={vi.fn()} onDelete={vi.fn()} />
    )

    // Assert: Name should still be visible
    expect(screen.getByText('Test Recipe')).toBeInTheDocument()
    // Optional fields should not be shown
    expect(screen.queryByText('Protein:')).not.toBeInTheDocument()
    expect(screen.queryByText('Carb:')).not.toBeInTheDocument()
    expect(screen.queryByText('Prep Time:')).not.toBeInTheDocument()
  })

  /**
   * Test 7: Different Tier Badges
   *
   * Verify different tiers display correctly.
   */
  it('should display correct tier badge for non-regular tier', () => {
    // Arrange
    const recipe = createMockRecipe({ tier: 'non-regular' })

    // Act
    render(
      <RecipeCard recipe={recipe} onEdit={vi.fn()} onDelete={vi.fn()} />
    )

    // Assert
    expect(screen.getByText('Non-Regular')).toBeInTheDocument()
  })
})
