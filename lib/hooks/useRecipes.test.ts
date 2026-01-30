/**
 * Hook Tests for useRecipes
 *
 * Testing React hooks requires special handling because:
 * - Hooks can only be called inside React components
 * - We need to trigger re-renders to see state updates
 * - Async operations (API calls) need to be awaited
 *
 * SOLUTION: Use `renderHook` from @testing-library/react
 *
 * renderHook wraps your hook in a test component and provides:
 * - result.current: The current return value of the hook
 * - rerender(): Trigger a re-render with new props
 * - waitFor(): Wait for async state updates
 *
 * KEY CONCEPTS:
 * 1. Mock fetch globally to control API responses
 * 2. Use act() for synchronous state updates
 * 3. Use waitFor() for async state updates
 * 4. Access hook return values via result.current
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useRecipes } from './useRecipes'
import type { Recipe } from '@/types'

/**
 * Mock window.confirm for delete confirmation
 * By default, auto-confirm (return true)
 */
vi.stubGlobal('confirm', vi.fn(() => true))

/**
 * Mock window.alert for error messages
 */
vi.stubGlobal('alert', vi.fn())

/**
 * Sample test data - reusable recipe fixtures
 */
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
    name: 'Pasta Carbonara',
    ingredients: 'pasta, eggs, bacon',
    proteinType: null,
    carbType: 'pasta',
    vegetableType: null,
    isLunchAppropriate: false,
    prepTime: 'medium',
    tier: 'regular',
    recipeUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'Salmon with Rice',
    ingredients: 'salmon, rice',
    proteinType: 'fish',
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
    id: '4',
    name: 'Greek Salad',
    ingredients: 'lettuce, tomatoes, feta, olives',
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
]

/**
 * Helper to create a mock fetch response
 *
 * fetch() returns a Response object with a json() method.
 * We need to mock both the Response and its json() method.
 */
function createMockFetchResponse(data: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
  } as Response)
}

describe('useRecipes', () => {
  /**
   * Before each test:
   * - Reset all mocks
   * - Set up a default fetch mock that returns our test recipes
   */
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: GET /api/recipes returns mockRecipes
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockRecipes),
    })
  })

  /**
   * After each test, restore any mocked globals
   */
  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Test 1: Initial Loading State
   *
   * When the hook first mounts, it should:
   * - Set isLoading to true
   * - Fetch recipes from the API
   * - Update state with the results
   */
  it('should fetch recipes on mount and update loading state', async () => {
    // Act: Render the hook
    const { result } = renderHook(() => useRecipes())

    // Assert: Initially loading
    expect(result.current.isLoading).toBe(true)
    expect(result.current.recipes).toEqual([])

    // Wait for async fetch to complete
    // waitFor repeatedly checks the condition until it passes or times out
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Assert: Recipes loaded
    expect(result.current.recipes).toEqual(mockRecipes)
    expect(result.current.filteredRecipes).toEqual(mockRecipes)

    // Verify fetch was called correctly
    expect(fetch).toHaveBeenCalledWith('/api/recipes')
  })

  /**
   * Test 2: Filtering by Tier
   *
   * When a filter is applied, filteredRecipes should update
   * while recipes (the source of truth) stays the same.
   */
  it('should filter recipes by tier', async () => {
    // Arrange: Render hook and wait for initial load
    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Act: Apply tier filter
    // We use act() because handleFilterChange triggers a state update
    act(() => {
      result.current.handleFilterChange('tier', 'favorite')
    })

    // Assert: Only favorites shown (Grilled Chicken, Salmon with Rice, Greek Salad)
    // Wait for the filter effect to run
    await waitFor(() => {
      expect(result.current.filteredRecipes).toHaveLength(3)
    })

    // All filtered recipes should be favorites
    expect(
      result.current.filteredRecipes.every((r) => r.tier === 'favorite')
    ).toBe(true)

    // Original recipes unchanged
    expect(result.current.recipes).toHaveLength(4)
  })

  /**
   * Test 3: Filtering by Protein Type
   */
  it('should filter recipes by protein type', async () => {
    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Apply protein filter
    act(() => {
      result.current.handleFilterChange('proteinType', 'chicken')
    })

    await waitFor(() => {
      expect(result.current.filteredRecipes).toHaveLength(1)
    })

    expect(result.current.filteredRecipes[0].name).toBe('Grilled Chicken')
  })

  /**
   * Test 3b: Filtering by Lunch Appropriate
   */
  it('should filter recipes by isLunchAppropriate', async () => {
    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Apply lunch filter (true)
    act(() => {
      result.current.handleFilterChange('isLunchAppropriate', 'true')
    })

    await waitFor(() => {
      expect(result.current.filteredRecipes).toHaveLength(1)
    })

    expect(result.current.filteredRecipes[0].name).toBe('Greek Salad')
    expect(result.current.filteredRecipes[0].isLunchAppropriate).toBe(true)

    // Clear and filter for not lunch appropriate (3 of 4 recipes)
    act(() => {
      result.current.handleFilterChange('isLunchAppropriate', 'false')
    })

    await waitFor(() => {
      expect(result.current.filteredRecipes).toHaveLength(3)
    })

    expect(result.current.filteredRecipes.every(r => r.isLunchAppropriate === false)).toBe(true)
  })

  /**
   * Test 4: Clearing a Filter
   *
   * Setting a filter to 'all' should remove that filter.
   */
  it('should clear filter when set to "all"', async () => {
    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Apply filter
    act(() => {
      result.current.handleFilterChange('tier', 'favorite')
    })

    await waitFor(() => {
      expect(result.current.filteredRecipes).toHaveLength(3)
    })

    // Clear filter by setting to 'all'
    act(() => {
      result.current.handleFilterChange('tier', 'all')
    })

    await waitFor(() => {
      expect(result.current.filteredRecipes).toHaveLength(4)
    })

    // Filter should be undefined in state
    expect(result.current.filters.tier).toBeUndefined()
  })

  /**
   * Test 5: Multiple Filters Combined
   *
   * Multiple filters should work together (AND logic).
   */
  it('should apply multiple filters together', async () => {
    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Apply both tier and proteinType filters
    act(() => {
      result.current.handleFilterChange('tier', 'favorite')
      result.current.handleFilterChange('proteinType', 'fish')
    })

    await waitFor(() => {
      // Only "Salmon with Rice" is both favorite AND fish protein
      expect(result.current.filteredRecipes).toHaveLength(1)
    })

    expect(result.current.filteredRecipes[0].name).toBe('Salmon with Rice')
  })

  /**
   * Test 6: Creating a Recipe
   *
   * handleCreate should:
   * - POST to /api/recipes
   * - Refresh the recipe list on success
   * - Return true on success, false on failure
   */
  it('should create a recipe and refresh the list', async () => {
    // Setup: Mock POST to return success, then GET returns updated list
    const newRecipe = { ...mockRecipes[0], id: '4', name: 'New Recipe' }
    const updatedRecipes = [...mockRecipes, newRecipe]

    global.fetch = vi
      .fn()
      // First call: initial GET
      .mockResolvedValueOnce(createMockFetchResponse(mockRecipes))
      // Second call: POST (create)
      .mockResolvedValueOnce(createMockFetchResponse(newRecipe))
      // Third call: GET after create (refresh)
      .mockResolvedValueOnce(createMockFetchResponse(updatedRecipes))

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Act: Create a recipe
    let createResult: boolean | undefined
    await act(async () => {
      createResult = await result.current.handleCreate({
        name: 'New Recipe',
        ingredients: 'stuff',
        prepTime: 'quick',
        tier: 'regular',
      })
    })

    // Assert: Success returned
    expect(createResult).toBe(true)

    // Verify POST was called with correct data
    expect(fetch).toHaveBeenCalledWith('/api/recipes/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('New Recipe'),
    })

    // Wait for refresh (4 original + 1 new = 5)
    await waitFor(() => {
      expect(result.current.recipes).toHaveLength(5)
    })
  })

  /**
   * Test 7: Create Recipe Failure
   *
   * When the API returns an error, handleCreate should return false.
   */
  it('should return false when create fails', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(createMockFetchResponse(mockRecipes))
      // POST fails
      .mockResolvedValueOnce(createMockFetchResponse({ error: 'Failed' }, false))

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let createResult: boolean | undefined
    await act(async () => {
      createResult = await result.current.handleCreate({
        name: 'Bad Recipe',
        ingredients: '',
        prepTime: 'quick',
        tier: 'regular',
      })
    })

    expect(createResult).toBe(false)
  })

  /**
   * Test 8: Updating a Recipe
   */
  it('should update a recipe and refresh the list', async () => {
    const updatedRecipe = { ...mockRecipes[0], name: 'Updated Chicken' }
    const updatedList = [updatedRecipe, mockRecipes[1], mockRecipes[2]]

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(createMockFetchResponse(mockRecipes))
      .mockResolvedValueOnce(createMockFetchResponse(updatedRecipe)) // PATCH
      .mockResolvedValueOnce(createMockFetchResponse(updatedList)) // refresh

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let updateResult: boolean | undefined
    await act(async () => {
      updateResult = await result.current.handleUpdate('1', {
        name: 'Updated Chicken',
        ingredients: 'chicken, new spices',
        prepTime: 'quick',
        tier: 'favorite',
      })
    })

    expect(updateResult).toBe(true)

    // Verify PATCH was called
    expect(fetch).toHaveBeenCalledWith('/api/recipes/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('Updated Chicken'),
    })
  })

  /**
   * Test 9: Deleting a Recipe
   */
  it('should delete a recipe after confirmation', async () => {
    const afterDelete = mockRecipes.slice(1) // Remove first recipe

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(createMockFetchResponse(mockRecipes))
      .mockResolvedValueOnce(createMockFetchResponse({ success: true })) // DELETE
      .mockResolvedValueOnce(createMockFetchResponse(afterDelete)) // refresh

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let deleteResult: boolean | undefined
    await act(async () => {
      deleteResult = await result.current.handleDelete('1')
    })

    expect(deleteResult).toBe(true)

    // Verify confirm was called
    expect(confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this recipe?'
    )

    // Verify DELETE was called
    expect(fetch).toHaveBeenCalledWith('/api/recipes/1', {
      method: 'DELETE',
    })

    // Wait for refresh
    await waitFor(() => {
      expect(result.current.recipes).toHaveLength(3)
    })
  })

  /**
   * Test 10: Delete Cancelled by User
   *
   * If user clicks "Cancel" on confirm dialog, delete should not proceed.
   */
  it('should not delete when user cancels confirmation', async () => {
    // Mock confirm to return false (user clicked Cancel)
    vi.mocked(confirm).mockReturnValueOnce(false)

    global.fetch = vi
      .fn()
      .mockResolvedValue(createMockFetchResponse(mockRecipes))

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    let deleteResult: boolean | undefined
    await act(async () => {
      deleteResult = await result.current.handleDelete('1')
    })

    expect(deleteResult).toBe(false)

    // Fetch should only have been called once (initial load)
    // No DELETE request should have been made
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  /**
   * Test 11: Handle Fetch Error
   *
   * When the API call fails entirely (network error),
   * the hook should handle it gracefully.
   */
  it('should handle fetch error gracefully', async () => {
    // Mock fetch to throw an error
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    // Spy on console.error to verify error is logged
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useRecipes())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Should have empty recipes but not crash
    expect(result.current.recipes).toEqual([])
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})

/**
 * KEY TAKEAWAYS FOR HOOK TESTING:
 *
 * 1. USE renderHook() - It wraps your hook in a component
 *    const { result } = renderHook(() => useMyHook())
 *
 * 2. ACCESS CURRENT VALUES via result.current
 *    expect(result.current.someValue).toBe(...)
 *
 * 3. USE act() FOR SYNCHRONOUS UPDATES
 *    act(() => { result.current.doSomething() })
 *
 * 4. USE waitFor() FOR ASYNC UPDATES
 *    await waitFor(() => { expect(...).toBe(...) })
 *
 * 5. MOCK GLOBALS (fetch, confirm, alert)
 *    global.fetch = vi.fn().mockResolvedValue(...)
 *    vi.stubGlobal('confirm', vi.fn(() => true))
 *
 * 6. CHAIN MOCK RESPONSES for multi-step flows
 *    vi.fn()
 *      .mockResolvedValueOnce(firstResponse)
 *      .mockResolvedValueOnce(secondResponse)
 *
 * 7. TEST THE CONTRACT, NOT INTERNALS
 *    - Test what the hook returns and how it behaves
 *    - Don't test useState/useEffect directly
 */
