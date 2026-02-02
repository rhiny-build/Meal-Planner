/**
 * Component Tests for MealPlanDrawer
 *
 * Tests the expandable drawer that shows ingredient details for a day's meals.
 *
 * TESTING APPROACH:
 * - Test rendering of recipe cards with ingredients
 * - Test placeholder states when recipes are missing
 * - Test recipe URL links vs plain text
 * - Test empty state when no meals selected
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as Collapsible from '@radix-ui/react-collapsible'
import MealPlanDrawer from './MealPlanDrawer'
import type { RecipeWithIngredients } from '@/types'

/**
 * Create a mock recipe with structured ingredients
 */
function createMockRecipe(overrides: Partial<RecipeWithIngredients> = {}): RecipeWithIngredients {
  return {
    id: 'test-recipe-id',
    name: 'Test Recipe',
    ingredients: 'ingredient 1\ningredient 2',
    proteinType: 'chicken',
    carbType: null,
    vegetableType: null,
    recipeUrl: null,
    isLunchAppropriate: false,
    prepTime: 'quick',
    tier: 'favorite',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    structuredIngredients: [
      { id: 'ing-1', recipeId: 'test-recipe-id', name: 'chicken breast', quantity: '2', unit: 'lbs', notes: null, order: 0 },
      { id: 'ing-2', recipeId: 'test-recipe-id', name: 'garlic', quantity: '3', unit: 'cloves', notes: 'minced', order: 1 },
    ],
    ...overrides,
  }
}

/**
 * Wrapper to render MealPlanDrawer inside Radix Collapsible context
 * The drawer uses Collapsible.Content which needs a parent Collapsible.Root
 */
function renderDrawer(props: Parameters<typeof MealPlanDrawer>[0]) {
  return render(
    <Collapsible.Root open={true}>
      <MealPlanDrawer {...props} />
    </Collapsible.Root>
  )
}

describe('MealPlanDrawer', () => {
  describe('Recipe Card Rendering', () => {
    it('should render recipe name and label', () => {
      // Arrange
      const lunchRecipe = createMockRecipe({ name: 'Chicken Salad' })

      // Act
      renderDrawer({
        isOpen: true,
        lunchRecipe,
        proteinRecipe: null,
        carbRecipe: null,
        vegetableRecipe: null,
      })

      // Assert - target the font-semibold header element specifically to avoid matching parent elements
      expect(screen.getByText((content, element) =>
        element?.classList?.contains('font-semibold') &&
        element?.textContent?.includes('Lunch:') &&
        element?.textContent?.includes('Chicken Salad') || false
      )).toBeInTheDocument()
    })

    it('should render structured ingredients with quantity, unit, and name', () => {
      // Arrange
      const proteinRecipe = createMockRecipe({
        name: 'Grilled Salmon',
        structuredIngredients: [
          { id: 'ing-1', recipeId: 'test', name: 'salmon fillet', quantity: '4', unit: 'oz', notes: null, order: 0 },
          { id: 'ing-2', recipeId: 'test', name: 'lemon', quantity: '1', unit: null, notes: null, order: 1 },
        ],
      })

      // Act
      renderDrawer({
        isOpen: true,
        lunchRecipe: null,
        proteinRecipe,
        carbRecipe: null,
        vegetableRecipe: null,
      })

      // Assert
      expect(screen.getByText(/4/)).toBeInTheDocument()
      expect(screen.getByText(/oz/)).toBeInTheDocument()
      expect(screen.getByText('salmon fillet')).toBeInTheDocument()
      expect(screen.getByText('lemon')).toBeInTheDocument()
    })

    it('should render ingredient notes in parentheses', () => {
      // Arrange
      const carbRecipe = createMockRecipe({
        name: 'Rice Pilaf',
        structuredIngredients: [
          { id: 'ing-1', recipeId: 'test', name: 'rice', quantity: '2', unit: 'cups', notes: 'rinsed', order: 0 },
        ],
      })

      // Act
      renderDrawer({
        isOpen: true,
        lunchRecipe: null,
        proteinRecipe: null,
        carbRecipe,
        vegetableRecipe: null,
      })

      // Assert
      expect(screen.getByText('(rinsed)')).toBeInTheDocument()
    })

    it('should show "No ingredients listed" when recipe has no structured ingredients', () => {
      // Arrange
      const vegetableRecipe = createMockRecipe({
        name: 'Garden Salad',
        structuredIngredients: [],
      })

      // Act
      renderDrawer({
        isOpen: true,
        lunchRecipe: null,
        proteinRecipe: null,
        carbRecipe: null,
        vegetableRecipe,
      })

      // Assert
      expect(screen.getByText('No ingredients listed')).toBeInTheDocument()
    })
  })

  describe('Recipe URL Links', () => {
    it('should render recipe name as link when recipeUrl exists', () => {
      // Arrange
      const lunchRecipe = createMockRecipe({
        name: 'Online Recipe',
        recipeUrl: 'https://example.com/recipe',
      })

      // Act
      renderDrawer({
        isOpen: true,
        lunchRecipe,
        proteinRecipe: null,
        carbRecipe: null,
        vegetableRecipe: null,
      })

      // Assert
      const link = screen.getByRole('link', { name: 'Online Recipe' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', 'https://example.com/recipe')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('should render recipe name as plain text when recipeUrl is null', () => {
      // Arrange
      const proteinRecipe = createMockRecipe({
        name: 'Homemade Recipe',
        recipeUrl: null,
      })

      // Act
      renderDrawer({
        isOpen: true,
        lunchRecipe: null,
        proteinRecipe,
        carbRecipe: null,
        vegetableRecipe: null,
      })

      // Assert - text is in the DOM but not as a link
      expect(screen.getByText((content) => content.includes('Homemade Recipe'))).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Homemade Recipe' })).not.toBeInTheDocument()
    })
  })

  describe('Placeholder States', () => {
    it('should show "No lunch selected" when lunchRecipe is null', () => {
      // Arrange & Act
      renderDrawer({
        isOpen: true,
        lunchRecipe: null,
        proteinRecipe: createMockRecipe(),
        carbRecipe: null,
        vegetableRecipe: null,
      })

      // Assert
      expect(screen.getByText('No lunch selected')).toBeInTheDocument()
    })

    it('should show "No protein selected" when proteinRecipe is null', () => {
      // Arrange & Act
      renderDrawer({
        isOpen: true,
        lunchRecipe: createMockRecipe(),
        proteinRecipe: null,
        carbRecipe: null,
        vegetableRecipe: null,
      })

      // Assert
      expect(screen.getByText('No protein selected')).toBeInTheDocument()
    })

    it('should show "No carb selected" when carbRecipe is null', () => {
      // Arrange & Act
      renderDrawer({
        isOpen: true,
        lunchRecipe: createMockRecipe(),
        proteinRecipe: null,
        carbRecipe: null,
        vegetableRecipe: null,
      })

      // Assert
      expect(screen.getByText('No carb selected')).toBeInTheDocument()
    })

    it('should show "No vegetable selected" when vegetableRecipe is null', () => {
      // Arrange & Act
      renderDrawer({
        isOpen: true,
        lunchRecipe: createMockRecipe(),
        proteinRecipe: null,
        carbRecipe: null,
        vegetableRecipe: null,
      })

      // Assert
      expect(screen.getByText('No vegetable selected')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show "No meals selected for this day" when all recipes are null', () => {
      // Arrange & Act
      renderDrawer({
        isOpen: true,
        lunchRecipe: null,
        proteinRecipe: null,
        carbRecipe: null,
        vegetableRecipe: null,
      })

      // Assert
      expect(screen.getByText('No meals selected for this day')).toBeInTheDocument()
    })

    it('should not show individual placeholders when all recipes are null', () => {
      // Arrange & Act
      renderDrawer({
        isOpen: true,
        lunchRecipe: null,
        proteinRecipe: null,
        carbRecipe: null,
        vegetableRecipe: null,
      })

      // Assert - should show single message, not individual placeholders
      expect(screen.queryByText('No lunch selected')).not.toBeInTheDocument()
      expect(screen.queryByText('No protein selected')).not.toBeInTheDocument()
    })
  })

  describe('All Four Meal Types', () => {
    it('should render all four recipe cards when all recipes provided', () => {
      // Arrange
      const lunchRecipe = createMockRecipe({ id: 'lunch', name: 'Lunch Dish' })
      const proteinRecipe = createMockRecipe({ id: 'protein', name: 'Protein Dish' })
      const carbRecipe = createMockRecipe({ id: 'carb', name: 'Carb Dish' })
      const vegetableRecipe = createMockRecipe({ id: 'veg', name: 'Vegetable Dish' })

      // Act
      renderDrawer({
        isOpen: true,
        lunchRecipe,
        proteinRecipe,
        carbRecipe,
        vegetableRecipe,
      })

      // Assert - use function matchers since text is split across elements
      expect(screen.getByText((content) => content.includes('Lunch Dish'))).toBeInTheDocument()
      expect(screen.getByText((content) => content.includes('Protein Dish'))).toBeInTheDocument()
      expect(screen.getByText((content) => content.includes('Carb Dish'))).toBeInTheDocument()
      expect(screen.getByText((content) => content.includes('Vegetable Dish'))).toBeInTheDocument()
    })
  })
})
