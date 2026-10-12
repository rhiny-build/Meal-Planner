/**
 * AI Layer Tests - Mocking External API Calls
 *
 * Testing AI/LLM integrations is tricky because:
 * 1. API calls are slow and cost money
 * 2. Responses can vary (non-deterministic)
 * 3. Tests shouldn't depend on external services
 *
 * SOLUTION: Mock the Claude client entirely
 *
 * We mock the `anthropic` export from './claude' to return predictable responses.
 * This lets us test that our code:
 * - Formats prompts correctly
 * - Parses responses correctly
 * - Handles errors gracefully
 *
 * WITHOUT actually calling Claude's API!
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch globally for URL fetching
const mockFetch = vi.fn()
global.fetch = mockFetch

/**
 * Mock the Anthropic SDK so callForcedTool (the real helper) talks to a stub
 */
const mockAnthropic = vi.hoisted(() => ({ messages: { create: vi.fn() } }))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = mockAnthropic.messages
  },
}))

// Import after mocking so we get the mocked version
import { extractIngredientsFromURL } from '@/lib/ai/extractIngredientsFromURL'
const anthropic = mockAnthropic

/** Build a Claude response containing a forced tool_use block */
const toolUse = (name: string, input: unknown) => ({
  content: [{ type: 'tool_use', id: 'tu_1', name, input }],
})

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
    const mockResponse = toolUse('record_recipe', {
      name: 'Simple Flour Recipe',
      ingredients: '2 cups flour',
      structuredIngredients: [
        { name: 'flour', quantity: '2', unit: 'cups', notes: null, order: 0 },
      ],
    })

    vi.mocked(anthropic.messages.create).mockResolvedValue(
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

    // Verify Claude was called with a forced tool
    expect(anthropic.messages.create).toHaveBeenCalledTimes(1)
    expect(vi.mocked(anthropic.messages.create).mock.calls[0][0]).toMatchObject({
      tool_choice: { type: 'tool', name: 'record_recipe' },
    })
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
  it('should throw user-friendly error when Claude API fails', async () => {
    // Arrange: Mock successful fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><body>Recipe</body></html>'),
    })

    // Simulate API failure
    vi.mocked(anthropic.messages.create).mockRejectedValue(
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
  it('should throw error when Claude returns no tool call', async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><body>Recipe</body></html>'),
    })

    vi.mocked(anthropic.messages.create).mockResolvedValue({
      content: [{ type: 'text', text: 'Sorry, no tool call' }],
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
    const mockResponse = toolUse('record_recipe', {
      name: 'Test Recipe',
      structuredIngredients: [
        { name: 'chicken', quantity: '2', unit: 'lbs', notes: 'diced' },
        { name: 'salt', quantity: null, unit: null, notes: 'to taste' },
      ],
    })

    vi.mocked(anthropic.messages.create).mockResolvedValue(
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
