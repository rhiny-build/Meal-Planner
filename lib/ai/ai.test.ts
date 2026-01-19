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

/**
 * Mock the OpenAI client module
 *
 * We're mocking the entire './client' module which exports:
 * - openai: The OpenAI client instance
 * - MODEL: The model name string
 *
 * The mock replaces openai.chat.completions.create() with a function
 * we can control to return whatever we want.
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
import { extractIngredientsFromText } from '@/lib/ai/extractIngredientsFromText'
import { openai } from '@/lib/ai/client'

describe('extractIngredientsFromText', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
  })

  /**
   * Test 1: Successful extraction
   *
   * Verify that when OpenAI returns a valid response,
   * our function parses it correctly.
   */
  it('should extract ingredients from recipe text', async () => {
    // Arrange: Mock OpenAI to return a successful response
    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              ingredients: '2 chicken breasts\n1 tbsp olive oil\n3 cloves garlic',
              name: 'Garlic Chicken',
            }),
          },
        },
      ],
    }

    // Set up the mock to return our fake response
    vi.mocked(openai.chat.completions.create).mockResolvedValue(
      mockResponse as any
    )

    // Act: Call our function
    const result = await extractIngredientsFromText(`
      Garlic Chicken Recipe
      Ingredients:
      - 2 chicken breasts
      - 1 tbsp olive oil
      - 3 cloves garlic
      Instructions: Cook everything together.
    `)

    // Assert: Check the result
    expect(result.ingredients).toBe(
      '2 chicken breasts\n1 tbsp olive oil\n3 cloves garlic'
    )
    expect(result.name).toBe('Garlic Chicken')

    // Verify OpenAI was called
    expect(openai.chat.completions.create).toHaveBeenCalledTimes(1)
  })

  /**
   * Test 2: Verify the prompt format
   *
   * We can inspect HOW our function calls OpenAI to ensure
   * we're sending the right messages and parameters.
   */
  it('should call OpenAI with correct parameters', async () => {
    // Arrange
    vi.mocked(openai.chat.completions.create).mockResolvedValue({
      choices: [{ message: { content: '{"ingredients": "test"}' } }],
    } as any)

    // Act
    await extractIngredientsFromText('Some recipe text')

    // Assert: Check the call parameters
    expect(openai.chat.completions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini-test', // Our mocked MODEL constant
        response_format: { type: 'json_object' },
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            // The actual system message mentions extracting ingredients
            content: expect.stringContaining('extracts ingredients'),
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Some recipe text'),
          }),
        ]),
      })
    )
  })

  /**
   * Test 3: Handle missing ingredients field
   *
   * What if the AI returns unexpected data?
   * Our function should handle this gracefully.
   */
  it('should handle response without name field', async () => {
    // Arrange: AI returns only ingredients, no name
    vi.mocked(openai.chat.completions.create).mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              ingredients: 'salt\npepper',
              // no 'name' field
            }),
          },
        },
      ],
    } as any)

    // Act
    const result = await extractIngredientsFromText('A simple recipe')

    // Assert: Should still work, name is optional
    expect(result.ingredients).toBe('salt\npepper')
    expect(result.name).toBeUndefined()
  })

  /**
   * Test 4: Handle API errors
   *
   * What happens when OpenAI fails? Our function should:
   * - Catch the error
   * - Throw a user-friendly error message
   */
  it('should throw user-friendly error when API fails', async () => {
    // Arrange: Simulate API failure
    vi.mocked(openai.chat.completions.create).mockRejectedValue(
      new Error('API rate limit exceeded')
    )

    // Act & Assert: Expect the function to throw
    await expect(
      extractIngredientsFromText('Some recipe')
    ).rejects.toThrow('Failed to extract ingredients')
  })

  /**
   * Test 5: Handle empty response
   *
   * What if OpenAI returns no content?
   */
  it('should throw error when AI returns no content', async () => {
    // Arrange: Empty response
    vi.mocked(openai.chat.completions.create).mockResolvedValue({
      choices: [{ message: { content: null } }],
    } as any)

    // Act & Assert
    await expect(
      extractIngredientsFromText('Recipe text')
    ).rejects.toThrow('Failed to extract ingredients')
  })

  /**
   * Test 6: Handle malformed JSON
   *
   * What if OpenAI returns invalid JSON?
   */
  it('should throw error when AI returns invalid JSON', async () => {
    // Arrange: Invalid JSON in response
    vi.mocked(openai.chat.completions.create).mockResolvedValue({
      choices: [{ message: { content: 'not valid json' } }],
    } as any)

    // Act & Assert
    await expect(
      extractIngredientsFromText('Recipe text')
    ).rejects.toThrow('Failed to extract ingredients')
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
 *
 * 4. For E2E/smoke tests, you might want ONE real API test
 *    - Run it separately, infrequently (e.g., daily)
 *    - Mark it with a special tag to skip in normal test runs
 *    - This catches API changes but doesn't slow down development
 */
