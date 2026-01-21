/**
 * API Route Tests for /api/recipes
 *
 * Testing API routes requires a different approach than pure functions:
 * - We need to MOCK external dependencies (like Prisma database calls)
 * - We need to create fake Request objects
 * - We verify both the response data AND status codes
 *
 * WHY MOCK THE DATABASE?
 * - Unit tests should be fast and isolated
 * - We don't want tests to depend on database state
 * - We can test edge cases (errors, empty results) easily
 * - Real database testing belongs in INTEGRATION tests
 *
 * MOCKING PATTERN:
 * 1. vi.mock() tells Vitest to replace a module
 * 2. vi.mocked() gives us type-safe access to mock functions
 * 3. mockResolvedValue() sets up what the mock should return
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Mock Prisma BEFORE importing the route handler
 *
 * vi.mock() is hoisted to the top of the file, so even though it appears
 * here, it actually runs before any imports. This ensures the route handler
 * gets the mocked version of Prisma.
 */
vi.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Now import the route handler and the mocked Prisma
import { GET, POST } from '@/app/api/recipes/route'
import { prisma } from '@/lib/prisma'

/**
 * Sample test data
 *
 * Define reusable test fixtures at the top of your test file.
 * This makes tests more readable and easier to maintain.
 */
const mockRecipes = [
  {
    id: 'recipe-1',
    name: 'Grilled Chicken',
    ingredients: 'chicken breast\nolive oil\ngarlic',
    proteinType: 'chicken',
    carbType: null,
    vegetableType: null,
    prepTime: 'quick',
    tier: 'favorite',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'recipe-2',
    name: 'Pasta Carbonara',
    ingredients: 'pasta\neggs\nbacon\nparmesan',
    proteinType: null,
    carbType: 'pasta',
    vegetableType: null,
    prepTime: 'medium',
    tier: 'regular',
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
  },
]

/**
 * Helper to create a mock NextRequest
 *
 * Next.js API routes receive NextRequest objects. We need to create
 * fake ones for testing. This helper makes that easy.
 */
function createMockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

describe('GET /api/recipes', () => {
  /**
   * beforeEach runs before EACH test in this describe block
   *
   * Use it to reset mocks so each test starts fresh.
   * This prevents tests from affecting each other.
   */
  beforeEach(() => {
    // Clear all mock call history and reset implementations
    vi.clearAllMocks()
  })

  it('should return all recipes when no filters provided', async () => {
    // Arrange: Set up the mock to return our test data
    vi.mocked(prisma.recipe.findMany).mockResolvedValue(mockRecipes)

    // Create a request with no query parameters
    const request = createMockRequest('/api/recipes')

    // Act: Call the route handler
    const response = await GET(request)
    const data = await response.json()

    // Assert: Check the response
    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(data[0].name).toBe('Grilled Chicken')

    // Also verify Prisma was called correctly
    expect(prisma.recipe.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.recipe.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
    })
  })

  it('should filter by proteinType when provided', async () => {
    // Arrange: Return only chicken recipes
    const chickenRecipes = mockRecipes.filter((r) => r.proteinType === 'chicken')
    vi.mocked(prisma.recipe.findMany).mockResolvedValue(chickenRecipes)

    // Create request with query parameter
    const request = createMockRequest('/api/recipes?proteinType=chicken')

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)

    // Verify the where clause includes the filter
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { proteinType: 'chicken' },
      })
    )
  })

  it('should filter by multiple parameters', async () => {
    // Arrange
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([])

    const request = createMockRequest(
      '/api/recipes?proteinType=chicken&tier=favorite&prepTime=quick'
    )

    // Act
    const response = await GET(request)

    // Assert: Verify all filters were applied
    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          proteinType: 'chicken',
          tier: 'favorite',
          prepTime: 'quick',
        },
      })
    )
  })

  it('should return empty array when no recipes match', async () => {
    // Arrange: Database returns no results
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([])

    const request = createMockRequest('/api/recipes?proteinType=fish')

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert: Empty array is a valid response, not an error
    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should return 500 when database error occurs', async () => {
    // Arrange: Simulate a database failure
    vi.mocked(prisma.recipe.findMany).mockRejectedValue(
      new Error('Database connection failed')
    )

    const request = createMockRequest('/api/recipes')

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert: Should return 500 error status
    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch recipes')
  })
})

describe('POST /api/recipes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a recipe with valid data', async () => {
    // Arrange: Mock successful creation
    const newRecipe = {
      id: 'recipe-new',
      name: 'New Recipe',
      ingredients: 'ingredient 1\ningredient 2',
      proteinType: 'chicken',
      carbType: null,
      vegetableType: null,
      prepTime: 'quick',
      tier: 'regular',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(prisma.recipe.create).mockResolvedValue(newRecipe)

    // Create a POST request with JSON body
    const request = new NextRequest('http://localhost:3000/api/recipes', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Recipe',
        ingredients: 'ingredient 1\ningredient 2',
        proteinType: 'chicken',
        prepTime: 'quick',
        tier: 'regular',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert: Should return 201 Created
    expect(response.status).toBe(201)
    expect(data.name).toBe('New Recipe')
    expect(prisma.recipe.create).toHaveBeenCalledTimes(1)
  })

  it('should return 400 when name is missing', async () => {
    // Arrange: Request without required 'name' field
    const request = new NextRequest('http://localhost:3000/api/recipes', {
      method: 'POST',
      body: JSON.stringify({
        ingredients: 'some ingredients',
        tier: 'regular',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert: Should fail validation
    expect(response.status).toBe(400)
    expect(data.error).toBe('Name and ingredients are required')

    // Database should NOT have been called
    expect(prisma.recipe.create).not.toHaveBeenCalled()
  })

  it('should return 400 when ingredients are missing', async () => {
    // Arrange: Request without ingredients
    const request = new NextRequest('http://localhost:3000/api/recipes', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Recipe',
        tier: 'regular',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    // Database should NOT have been called
    expect(prisma.recipe.create).not.toHaveBeenCalled()
  })
})
