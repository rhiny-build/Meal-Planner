/**
 * AI Layer Tests - Mocking External API Calls
 *
 * Testing AI/LLM integrations is tricky because:
 * 1. API calls are slow and cost money
 * 2. Responses can vary (non-deterministic)
 * 3. Tests shouldn't depend on external services
 *
 * SOLUTION: Mock the OpenAI client entirely
 *
 * We mock the `openai` export from './client' to return predictable responses.
 * This lets us test that our code:
 * - Formats prompts correctly
 * - Parses responses correctly
 * - Handles errors gracefully
 *
 * WITHOUT actually calling OpenAI's API!
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally for URL fetching
const mockFetch = vi.fn()
global.fetch = mockFetch

/**
 * Mock the OpenAI client module
 */
vi.mock('@/lib/ai/client', () => ({
  MODEL: 'gpt-4o-mini-test',
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}))

// Import after mocking so we get the mocked version
import { extractIngredientsFromURL } from '@/lib/ai/extractIngredientsFromURL'
import { openai } from '@/lib/ai/client'

describe('extractIngredientsFromURL', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
  })

  /**
   * Test 1: Successful extraction from URL
   */
  it('should extract ingredients from a recipe URL', async () => {
    // Arrange: Mock fetch to return HTML content
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () =>
        Promise.resolve('<html><body>Recipe with 2 cups flour</body></html>'),
    })

    // Mock OpenAI to return a successful response
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              name: 'Simple Flour Recipe',
              ingredients: '2 cups flour',
              structuredIngredients: [
                { name: 'flour', quantity: '2', unit: 'cups', notes: null, order: 0 },
              ],
            }),
          },
        },
      ],
    }

    vi.mocked(openai.chat.completions.create).mockResolvedValue(
      mockResponse as any
    )

    // Act: Call our function
    const result = await extractIngredientsFromURL('https://example.com/recipe')

    // Assert: Check the result
    expect(result.name).toBe('Simple Flour Recipe')
    expect(result.ingredients).toBe('2 cups flour')
    expect(result.structuredIngredients).toHaveLength(1)
    expect(result.structuredIngredients?.[0].name).toBe('flour')
    expect(result.structuredIngredients?.[0].quantity).toBe('2')
    expect(result.structuredIngredients?.[0].unit).toBe('cups')

    // Verify fetch was called with the URL
    expect(mockFetch).toHaveBeenCalledWith('https://example.com/recipe', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MealPlannerBot/1.0)' },
    })

    // Verify OpenAI was called
    expect(openai.chat.completions.create).toHaveBeenCalledTimes(1)
  })

  /**
   * Test 2: Handle fetch failure
   */
  it('should throw error when URL fetch fails', async () => {
    // Arrange: Mock fetch to fail
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    // Act & Assert
    await expect(
      extractIngredientsFromURL('https://example.com/bad-url')
    ).rejects.toThrow('Failed to extract recipe from URL')
  })

  /**
   * Test 3: Handle API errors
   */
  it('should throw user-friendly error when OpenAI API fails', async () => {
    // Arrange: Mock successful fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><body>Recipe</body></html>'),
    })

    // Simulate API failure
    vi.mocked(openai.chat.completions.create).mockRejectedValue(
      new Error('API rate limit exceeded')
    )

    // Act & Assert
    await expect(
      extractIngredientsFromURL('https://example.com/recipe')
    ).rejects.toThrow('Failed to extract recipe from URL')
  })

  /**
   * Test 4: Handle empty AI response
   */
  it('should throw error when AI returns no content', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><body>Recipe</body></html>'),
    })

    vi.mocked(openai.chat.completions.create).mockResolvedValue({
      choices: [{ message: { content: null } }],
    } as any)

    // Act & Assert
    await expect(
      extractIngredientsFromURL('https://example.com/recipe')
    ).rejects.toThrow('Failed to extract recipe from URL')
  })

  /**
   * Test 5: Generate ingredients text from structured if not provided
   */
  it('should generate ingredients text from structured ingredients', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><body>Recipe</body></html>'),
    })

    // Response without ingredients text, only structured
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              name: 'Test Recipe',
              structuredIngredients: [
                { name: 'chicken', quantity: '2', unit: 'lbs', notes: 'diced' },
                { name: 'salt', quantity: null, unit: null, notes: 'to taste' },
              ],
            }),
          },
        },
      ],
    }

    vi.mocked(openai.chat.completions.create).mockResolvedValue(
      mockResponse as any
    )

    // Act
    const result = await extractIngredientsFromURL('https://example.com/recipe')

    // Assert: ingredients text should be generated from structured
    expect(result.ingredients).toBe('2 lbs chicken (diced)\nsalt (to taste)')
  })
})

/**
 * KEY TAKEAWAYS FOR AI TESTING:
 *
 * 1. ALWAYS mock external APIs in unit tests
 *    - Tests should be fast, free, and deterministic
 *    - Use vi.mock() to replace the API client
 *
 * 2. Test the contract, not the AI
 *    - You can't test if the AI gives "good" answers
 *    - But you CAN test that your code handles responses correctly
 *
 * 3. Test error handling thoroughly
 *    - AI APIs fail in many ways: rate limits, timeouts, bad responses
 *    - Your app should handle these gracefully
 */
