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
 */
vi.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Now import the route handlers and the mocked Prisma
import { GET } from '@/app/api/recipes/route'
import { POST } from '@/app/api/recipes/create/route'
import { prisma } from '@/lib/prisma'

/**
 * Sample test data
 */
const mockRecipes = [
  {
    id: 'recipe-1',
    name: 'Grilled Chicken',
    ingredients: 'chicken breast\nolive oil\ngarlic',
    proteinType: 'chicken',
    carbType: null,
    vegetableType: null,
    recipeUrl: null,
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
    recipeUrl: null,
    prepTime: 'medium',
    tier: 'regular',
    createdAt: new Date('2025-01-02'),
    updatedAt: new Date('2025-01-02'),
  },
]

/**
 * Helper to create a mock NextRequest
 */
function createMockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'))
}

describe('GET /api/recipes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return all recipes when no filters provided', async () => {
    vi.mocked(prisma.recipe.findMany).mockResolvedValue(mockRecipes)

    const request = createMockRequest('/api/recipes')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(data[0].name).toBe('Grilled Chicken')

    expect(prisma.recipe.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.recipe.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
    })
  })

  it('should filter by proteinType when provided', async () => {
    const chickenRecipes = mockRecipes.filter((r) => r.proteinType === 'chicken')
    vi.mocked(prisma.recipe.findMany).mockResolvedValue(chickenRecipes)

    const request = createMockRequest('/api/recipes?proteinType=chicken')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)

    expect(prisma.recipe.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { proteinType: 'chicken' },
      })
    )
  })

  it('should filter by multiple parameters', async () => {
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([])

    const request = createMockRequest(
      '/api/recipes?proteinType=chicken&tier=favorite&prepTime=quick'
    )

    const response = await GET(request)

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
    vi.mocked(prisma.recipe.findMany).mockResolvedValue([])

    const request = createMockRequest('/api/recipes?proteinType=fish')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('should return 500 when database error occurs', async () => {
    vi.mocked(prisma.recipe.findMany).mockRejectedValue(
      new Error('Database connection failed')
    )

    const request = createMockRequest('/api/recipes')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch recipes')
  })
})

describe('POST /api/recipes/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a recipe with valid data', async () => {
    // Arrange: Mock successful creation with structured ingredients
    const newRecipe = {
      id: 'recipe-new',
      name: 'New Recipe',
      ingredients: 'ingredient 1\ningredient 2',
      proteinType: 'chicken',
      carbType: null,
      vegetableType: null,
      recipeUrl: null,
      prepTime: 'quick',
      tier: 'favorite',
      createdAt: new Date(),
      updatedAt: new Date(),
      structuredIngredients: [
        { id: 'ing-1', recipeId: 'recipe-new', name: 'ingredient 1', quantity: null, unit: null, notes: null, order: 0, createdAt: new Date(), updatedAt: new Date() },
        { id: 'ing-2', recipeId: 'recipe-new', name: 'ingredient 2', quantity: null, unit: null, notes: null, order: 1, createdAt: new Date(), updatedAt: new Date() },
      ],
    }
    vi.mocked(prisma.recipe.create).mockResolvedValue(newRecipe as any)

    // Create a POST request with JSON body
    const request = new NextRequest('http://localhost:3000/api/recipes/create', {
      method: 'POST',
      body: JSON.stringify({
        name: 'New Recipe',
        ingredients: 'ingredient 1\ningredient 2',
        proteinType: 'chicken',
        prepTime: 'quick',
        tier: 'favorite',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    // Act
    const response = await POST(request)
    const data = await response.json()

    // Assert: Should return 201 Created
    expect(response.status).toBe(201)
    expect(data.name).toBe('New Recipe')
    expect(data.structuredIngredients).toHaveLength(2)
    expect(prisma.recipe.create).toHaveBeenCalledTimes(1)
  })

  it('should return 400 when name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/recipes/create', {
      method: 'POST',
      body: JSON.stringify({
        ingredients: 'some ingredients',
        tier: 'regular',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Name and ingredients are required')
    expect(prisma.recipe.create).not.toHaveBeenCalled()
  })

  it('should return 400 when ingredients are missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/recipes/create', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Recipe',
        tier: 'regular',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(prisma.recipe.create).not.toHaveBeenCalled()
  })
})
