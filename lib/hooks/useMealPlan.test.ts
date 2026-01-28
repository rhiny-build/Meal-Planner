/**
 * Hook Tests for useMealPlan
 *
 * Tests the meal plan state management hook, with focus on
 * vegetable support functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMealPlan } from './useMealPlan'
import type { Recipe, WeekPlan } from '@/types'

// Mock window.confirm for clear confirmation
vi.stubGlobal('confirm', vi.fn(() => true))

// Mock window.alert for save messages
vi.stubGlobal('alert', vi.fn())

// Sample recipe fixtures with different dish types
const mockRecipes: Recipe[] = [
  {
    id: '1',
    name: 'Grilled Chicken',
    ingredients: 'chicken, spices',
    proteinType: 'chicken',
    carbType: null,
    vegetableType: null,
    prepTime: 'quick',
    tier: 'favorite',
    recipeUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'Rice Pilaf',
    ingredients: 'rice, broth',
    proteinType: null,
    carbType: 'rice',
    vegetableType: null,
    prepTime: 'medium',
    tier: 'favorite',
    recipeUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Garden Salad',
    ingredients: 'lettuce, tomatoes',
    proteinType: null,
    carbType: null,
    vegetableType: 'vegetable',
    prepTime: 'quick',
    tier: 'favorite',
    recipeUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    name: 'Chicken Stir-Fry',
    ingredients: 'chicken, vegetables, soy sauce',
    proteinType: 'chicken',
    carbType: null,
    vegetableType: 'vegetable', // Both protein AND vegetable
    prepTime: 'medium',
    tier: 'favorite',
    recipeUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// Mock meal plan data (empty week)
const mockMealPlans: WeekPlan[] = []

function createMockFetchResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  } as Response)
}

describe('useMealPlan', () => {
  const startDate = new Date('2025-01-27') // A Monday

  beforeEach(() => {
    vi.clearAllMocks()

    // Default: recipes fetch and meal plan fetch
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/recipes') {
        return createMockFetchResponse(mockRecipes)
      }
      if (url.startsWith('/api/meal-plan')) {
        return createMockFetchResponse({ mealPlans: mockMealPlans })
      }
      return createMockFetchResponse({})
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Recipe Filtering', () => {
    it('should filter vegetable recipes correctly', async () => {
      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should have 2 vegetable recipes (Garden Salad and Chicken Stir-Fry)
      expect(result.current.vegetableRecipes).toHaveLength(2)
      expect(result.current.vegetableRecipes.map(r => r.name)).toContain('Garden Salad')
      expect(result.current.vegetableRecipes.map(r => r.name)).toContain('Chicken Stir-Fry')
    })

    it('should include recipes with multiple types in multiple lists', async () => {
      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Chicken Stir-Fry has both protein and vegetable types
      const stirFry = mockRecipes.find(r => r.name === 'Chicken Stir-Fry')!

      // Should appear in protein recipes
      expect(result.current.proteinRecipes.map(r => r.id)).toContain(stirFry.id)

      // Should also appear in vegetable recipes
      expect(result.current.vegetableRecipes.map(r => r.id)).toContain(stirFry.id)
    })
  })

  describe('handleRecipeChange', () => {
    it('should update vegetableRecipeId when column is vegetable', async () => {
      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Change vegetable selection for Monday (index 0)
      act(() => {
        result.current.handleRecipeChange(0, 'vegetable', '3') // Garden Salad
      })

      expect(result.current.weekPlan[0].vegetableRecipeId).toBe('3')
    })

    it('should update proteinRecipeId when column is protein', async () => {
      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.handleRecipeChange(0, 'protein', '1')
      })

      expect(result.current.weekPlan[0].proteinRecipeId).toBe('1')
    })

    it('should update carbRecipeId when column is carb', async () => {
      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.handleRecipeChange(0, 'carb', '2')
      })

      expect(result.current.weekPlan[0].carbRecipeId).toBe('2')
    })
  })

  describe('selectedCount', () => {
    it('should include vegetables in selected count', async () => {
      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Initially 0
      expect(result.current.selectedCount).toBe(0)

      // Add selections
      act(() => {
        result.current.handleRecipeChange(0, 'protein', '1')
        result.current.handleRecipeChange(0, 'carb', '2')
        result.current.handleRecipeChange(0, 'vegetable', '3')
      })

      // Should count all three
      expect(result.current.selectedCount).toBe(3)
    })
  })

  describe('handleClear', () => {
    it('should clear vegetableRecipeId along with protein and carb', async () => {
      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Set up some selections
      act(() => {
        result.current.handleRecipeChange(0, 'protein', '1')
        result.current.handleRecipeChange(0, 'carb', '2')
        result.current.handleRecipeChange(0, 'vegetable', '3')
      })

      expect(result.current.selectedCount).toBe(3)

      // Clear all
      act(() => {
        result.current.handleClear()
      })

      // All should be empty
      expect(result.current.weekPlan[0].proteinRecipeId).toBe('')
      expect(result.current.weekPlan[0].carbRecipeId).toBe('')
      expect(result.current.weekPlan[0].vegetableRecipeId).toBe('')
      expect(result.current.selectedCount).toBe(0)
    })

    it('should not clear when user cancels confirmation', async () => {
      vi.mocked(confirm).mockReturnValueOnce(false)

      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.handleRecipeChange(0, 'vegetable', '3')
      })

      act(() => {
        result.current.handleClear()
      })

      // Should still have the vegetable selection
      expect(result.current.weekPlan[0].vegetableRecipeId).toBe('3')
    })
  })

  describe('applyGeneratedPlan', () => {
    it('should apply vegetableRecipeId from AI-generated plan', async () => {
      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const generatedPlan = [
        {
          date: new Date('2025-01-27'),
          proteinRecipeId: '1',
          carbRecipeId: '2',
          vegetableRecipeId: '3',
        },
        {
          date: new Date('2025-01-28'),
          proteinRecipeId: '4',
          carbRecipeId: '',
          vegetableRecipeId: '3',
        },
      ]

      act(() => {
        result.current.applyGeneratedPlan(generatedPlan)
      })

      // Monday
      expect(result.current.weekPlan[0].proteinRecipeId).toBe('1')
      expect(result.current.weekPlan[0].carbRecipeId).toBe('2')
      expect(result.current.weekPlan[0].vegetableRecipeId).toBe('3')

      // Tuesday
      expect(result.current.weekPlan[1].proteinRecipeId).toBe('4')
      expect(result.current.weekPlan[1].carbRecipeId).toBe('')
      expect(result.current.weekPlan[1].vegetableRecipeId).toBe('3')
    })
  })
})
