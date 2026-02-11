/**
 * Hook Tests for useMealPlan
 *
 * Tests the meal plan state management hook, with focus on
 * vegetable support functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMealPlan } from './useMealPlan'
import { getMonday } from '@/lib/dateUtils'
import type { Recipe, WeekPlan } from '@/types'

// Mock AI module to prevent OpenAI client initialization in jsdom
vi.mock('@/lib/ai/matchIngredients', () => ({
  matchIngredientsAgainstMasterList: vi.fn(),
}))

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
    isLunchAppropriate: false,
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
    isLunchAppropriate: false,
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
    isLunchAppropriate: true,
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
    isLunchAppropriate: false,
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
  // Use current week's Monday to avoid isWeekPast clearing notes
  const startDate = getMonday(new Date())

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

      // Use dates relative to startDate (current week's Monday)
      const monday = new Date(startDate)
      const tuesday = new Date(startDate)
      tuesday.setDate(tuesday.getDate() + 1)

      const generatedPlan = [
        {
          date: monday,
          proteinRecipeId: '1',
          carbRecipeId: '2',
          vegetableRecipeId: '3',
        },
        {
          date: tuesday,
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

  describe('Day Notes', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear()
    })

    it('should initialize with empty notes', async () => {
      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.dayNotes).toEqual({})
    })

    it('should update notes via handleNoteChange', async () => {
      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.handleNoteChange('Monday', 'Soccer practice at 6pm')
      })

      expect(result.current.dayNotes['Monday']).toBe('Soccer practice at 6pm')
    })

    it('should persist notes to localStorage', async () => {
      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      act(() => {
        result.current.handleNoteChange('Tuesday', 'Date night')
      })

      // Check localStorage directly
      const storageKey = `mealPlanNotes_${startDate.toISOString().split('T')[0]}`
      const stored = localStorage.getItem(storageKey)
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!)).toEqual({ Tuesday: 'Date night' })
    })

    it('should load notes from localStorage on mount', async () => {
      // Pre-populate localStorage
      const storageKey = `mealPlanNotes_${startDate.toISOString().split('T')[0]}`
      localStorage.setItem(storageKey, JSON.stringify({ Wednesday: 'Work late' }))

      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.dayNotes['Wednesday']).toBe('Work late')
    })

    it('should use different storage keys for different weeks', async () => {
      // Use current week and next week (not past weeks which get cleared)
      const week1 = getMonday(new Date())
      const week2 = new Date(week1)
      week2.setDate(week2.getDate() + 7) // Next week

      // Set notes for week 1
      const storageKey1 = `mealPlanNotes_${week1.toISOString().split('T')[0]}`
      localStorage.setItem(storageKey1, JSON.stringify({ Monday: 'Week 1 note' }))

      // Set notes for week 2
      const storageKey2 = `mealPlanNotes_${week2.toISOString().split('T')[0]}`
      localStorage.setItem(storageKey2, JSON.stringify({ Monday: 'Week 2 note' }))

      // Render hook for week 1
      const { result: result1 } = renderHook(() => useMealPlan(week1))
      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
      })
      expect(result1.current.dayNotes['Monday']).toBe('Week 1 note')

      // Render hook for week 2
      const { result: result2 } = renderHook(() => useMealPlan(week2))
      await waitFor(() => {
        expect(result2.current.isLoading).toBe(false)
      })
      expect(result2.current.dayNotes['Monday']).toBe('Week 2 note')
    })

    it('should handle multiple notes across days', async () => {
      const { result } = renderHook(() => useMealPlan(startDate))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Each state update needs its own act() to allow state to settle
      act(() => {
        result.current.handleNoteChange('Monday', 'Gym')
      })

      act(() => {
        result.current.handleNoteChange('Friday', 'Movie night')
      })

      act(() => {
        result.current.handleNoteChange('Sunday', 'Meal prep')
      })

      expect(result.current.dayNotes).toEqual({
        Monday: 'Gym',
        Friday: 'Movie night',
        Sunday: 'Meal prep',
      })
    })

    it('should auto-clear notes for past weeks', async () => {
      // Use a date from 2 weeks ago
      const pastWeek = new Date(startDate)
      pastWeek.setDate(pastWeek.getDate() - 14)

      // Pre-populate localStorage with notes for past week
      const storageKey = `mealPlanNotes_${pastWeek.toISOString().split('T')[0]}`
      localStorage.setItem(storageKey, JSON.stringify({ Monday: 'Old note' }))

      const { result } = renderHook(() => useMealPlan(pastWeek))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Notes should be cleared for past weeks
      expect(result.current.dayNotes).toEqual({})
      // localStorage should also be cleared
      expect(localStorage.getItem(storageKey)).toBeNull()
    })
  })
})
