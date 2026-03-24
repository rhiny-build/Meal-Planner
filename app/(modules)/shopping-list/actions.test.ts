/**
 * Shopping List Server Actions Tests
 *
 * Tests for the shopping list module server actions.
 * These tests mock Prisma and verify the business logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock AI embedding suggestions
vi.mock('@/lib/shopping-list/matchRecipeToMaster', () => ({
  findEmbeddingSuggestions: vi.fn(),
}))

// Mock AI master item normalisation
vi.mock('@/lib/shopping-list/normaliseMasterItem', () => ({
  normaliseMasterItems: vi.fn(),
}))

// Mock recipe ingredient normalisation — use deterministic normaliser (no DB/LLM in tests)
vi.mock('@/lib/shopping-list/normaliseRecipeIngredient', async () => {
  const { normaliseName } = await vi.importActual<typeof import('@/lib/shopping-list/normaliseRecipeIngredient')>('@/lib/shopping-list/normaliseRecipeIngredient')
  return {
    normaliseRecipeIngredient: vi.fn(async (raw: string) => normaliseName(raw)),
  }
})

// Mock AI embeddings
vi.mock('@/lib/shopping-list/ingredientEmbeddings', () => ({
  computeEmbeddings: vi.fn(),
  cosineSimilarity: vi.fn(),
}))

// Mock Prisma - use factory function to avoid hoisting issues
vi.mock('@/lib/prisma', () => ({
  prisma: {
    shoppingList: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    shoppingListItem: {
      update: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      aggregate: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    mealPlan: {
      findMany: vi.fn(),
    },
    masterListItem: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ingredientMapping: {
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    rejectedSuggestion: {
      findMany: vi.fn(),
    },
  },
}))

// Import after mocking
import {
  getShoppingList,
  toggleItem,
  addItem,
  ensureShoppingListExists,
  syncMealIngredients,
  includeMasterListItem,
  excludeMasterListItem,
  addMasterListItem,
  updateMasterListItem,
  deleteMasterListItem,
  createIngredientMapping,
} from './actions'
import { prisma } from '@/lib/prisma'
import { findEmbeddingSuggestions } from '@/lib/shopping-list/matchRecipeToMaster'
import { normaliseMasterItems } from '@/lib/shopping-list/normaliseMasterItem'
import { computeEmbeddings } from '@/lib/shopping-list/ingredientEmbeddings'

const mockFindEmbeddingSuggestions = findEmbeddingSuggestions as ReturnType<typeof vi.fn>
const mockNormaliseMasterItems = normaliseMasterItems as ReturnType<typeof vi.fn>
const mockComputeEmbeddings = computeEmbeddings as ReturnType<typeof vi.fn>

// Type assertion for mocked prisma
const mockPrisma = prisma as unknown as {
  shoppingList: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  shoppingListItem: {
    update: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    createMany: ReturnType<typeof vi.fn>
    aggregate: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    deleteMany: ReturnType<typeof vi.fn>
  }
  mealPlan: {
    findMany: ReturnType<typeof vi.fn>
  }
  masterListItem: {
    findMany: ReturnType<typeof vi.fn>
    aggregate: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  ingredientMapping: {
    findMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
  rejectedSuggestion: {
    findMany: ReturnType<typeof vi.fn>
  }
}

describe('Shopping List Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: empty master list and no mappings
    mockPrisma.masterListItem.findMany.mockResolvedValue([])
    mockPrisma.ingredientMapping.findMany.mockResolvedValue([])
    mockPrisma.ingredientMapping.update.mockResolvedValue({})
    mockPrisma.ingredientMapping.upsert.mockResolvedValue({})
    // Default: no rejected suggestions
    mockPrisma.rejectedSuggestion.findMany.mockResolvedValue([])
    // Default: stale reset succeeds
    mockPrisma.shoppingList.update.mockResolvedValue({})
    // Default: return distinct fake embedding vectors per input
    mockComputeEmbeddings.mockImplementation(async (texts: string[]) =>
      texts.map((_, i) => {
        const vec = [0, 0, 0]
        vec[i % 3] = 1
        return vec
      })
    )
  })

  describe('getShoppingList', () => {
    it('should fetch shopping list for a week', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = {
        id: 'list-1',
        weekStart: new Date('2026-02-03'),
        items: [
          { id: 'item-1', name: 'Milk', checked: false, source: 'staple', order: 0 },
          { id: 'item-2', name: 'Chicken', checked: false, source: 'recipe', order: 1 },
        ],
      }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)

      const result = await getShoppingList(weekStart)

      expect(mockPrisma.shoppingList.findUnique).toHaveBeenCalledWith({
        where: { weekStart: expect.any(Date) },
        include: { items: { orderBy: { order: 'asc' } } },
      })
      expect(result).toEqual(mockList)
    })

    it('should return null when no list exists', async () => {
      mockPrisma.shoppingList.findUnique.mockResolvedValue(null)

      const result = await getShoppingList(new Date('2026-02-03'))

      expect(result).toBeNull()
    })

    it('should normalize the weekStart date to midnight', async () => {
      const weekStart = new Date('2026-02-03T15:30:00Z')
      mockPrisma.shoppingList.findUnique.mockResolvedValue(null)

      await getShoppingList(weekStart)

      const calledDate = mockPrisma.shoppingList.findUnique.mock.calls[0][0].where.weekStart
      expect(calledDate.getHours()).toBe(0)
      expect(calledDate.getMinutes()).toBe(0)
      expect(calledDate.getSeconds()).toBe(0)
    })
  })

  describe('toggleItem', () => {
    it('should update item checked status to true', async () => {
      const mockItem = { id: 'item-1', name: 'Milk', checked: true }
      mockPrisma.shoppingListItem.update.mockResolvedValue(mockItem)

      const result = await toggleItem('item-1', true)

      expect(mockPrisma.shoppingListItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { checked: true },
      })
      expect(result).toEqual(mockItem)
    })

    it('should update item checked status to false', async () => {
      const mockItem = { id: 'item-1', name: 'Milk', checked: false }
      mockPrisma.shoppingListItem.update.mockResolvedValue(mockItem)

      const result = await toggleItem('item-1', false)

      expect(mockPrisma.shoppingListItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { checked: false },
      })
      expect(result).toEqual(mockItem)
    })
  })

  describe('addItem', () => {
    it('should add a manual item to the shopping list', async () => {
      const mockItem = {
        id: 'new-item',
        shoppingListId: 'list-1',
        name: 'Eggs',
        checked: false,
        source: 'manual',
        order: 5,
      }

      mockPrisma.shoppingListItem.aggregate.mockResolvedValue({ _max: { order: 4 } })
      mockPrisma.shoppingListItem.create.mockResolvedValue(mockItem)

      const result = await addItem('list-1', 'Eggs')

      expect(mockPrisma.shoppingListItem.aggregate).toHaveBeenCalledWith({
        where: { shoppingListId: 'list-1' },
        _max: { order: true },
      })
      expect(mockPrisma.shoppingListItem.create).toHaveBeenCalledWith({
        data: {
          shoppingListId: 'list-1',
          name: 'Eggs',
          checked: false,
          source: 'manual',
          order: 5,
        },
      })
      expect(result).toEqual(mockItem)
    })

    it('should handle empty list (no existing items)', async () => {
      const mockItem = {
        id: 'new-item',
        name: 'First Item',
        order: 0,
      }

      mockPrisma.shoppingListItem.aggregate.mockResolvedValue({ _max: { order: null } })
      mockPrisma.shoppingListItem.create.mockResolvedValue(mockItem)

      await addItem('list-1', 'First Item')

      expect(mockPrisma.shoppingListItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ order: 0 }),
      })
    })
  })

  describe('ensureShoppingListExists', () => {
    it('should return existing list if found', async () => {
      const mockList = {
        id: 'list-1',
        weekStart: new Date('2026-02-03'),
        items: [{ id: 'item-1', name: 'Milk', source: 'staple' }],
      }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)

      const result = await ensureShoppingListExists(new Date('2026-02-03'))

      expect(result).toEqual(mockList)
      expect(mockPrisma.shoppingList.create).not.toHaveBeenCalled()
    })

    it('should create list with staples when none exists', async () => {
      const mockStaples = [
        { id: 's1', name: 'Milk', type: 'staple', order: 0 },
        { id: 's2', name: 'Bread', type: 'staple', order: 1 },
      ]
      const mockCreatedList = {
        id: 'new-list',
        weekStart: new Date('2026-02-03'),
        items: [
          { id: 'item-1', name: 'Milk', source: 'staple', order: 0 },
          { id: 'item-2', name: 'Bread', source: 'staple', order: 1 },
        ],
      }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(null)
      mockPrisma.masterListItem.findMany.mockResolvedValue(mockStaples)
      mockPrisma.shoppingList.create.mockResolvedValue(mockCreatedList)

      const result = await ensureShoppingListExists(new Date('2026-02-03'))

      expect(mockPrisma.masterListItem.findMany).toHaveBeenCalledWith({
        where: { type: 'staple' },
        orderBy: { order: 'asc' },
      })
      expect(mockPrisma.shoppingList.create).toHaveBeenCalledWith({
        data: {
          weekStart: expect.any(Date),
          items: {
            create: [
              { name: 'Milk', checked: false, source: 'staple', order: 0 },
              { name: 'Bread', checked: false, source: 'staple', order: 1 },
            ],
          },
        },
        include: { items: { orderBy: { order: 'asc' } } },
      })
      expect(result).toEqual(mockCreatedList)
    })

    it('should normalize weekStart to midnight', async () => {
      mockPrisma.shoppingList.findUnique.mockResolvedValue({ id: 'list-1', items: [] })

      await ensureShoppingListExists(new Date('2026-02-03T15:30:00Z'))

      const calledDate = mockPrisma.shoppingList.findUnique.mock.calls[0][0].where.weekStart
      expect(calledDate.getHours()).toBe(0)
      expect(calledDate.getMinutes()).toBe(0)
    })
  })

  describe('syncMealIngredients', () => {
    it('should sync meal ingredients from meal plans', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart, items: [] }
      const mockMealPlans = [
        {
          lunchRecipe: null,
          proteinRecipe: {
            name: 'Chicken Stir Fry',
            structuredIngredients: [
              { name: 'chicken breast' },
              { name: 'soy sauce' },
            ],
          },
          carbRecipe: {
            name: 'Rice',
            structuredIngredients: [{ name: 'rice' }],
          },
          vegetableRecipe: null,
        },
      ]

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.mealPlan.findMany.mockResolvedValue(mockMealPlans)
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.shoppingListItem.createMany.mockResolvedValue({ count: 3 })

      const result = await syncMealIngredients(weekStart)

      // Should delete old recipe items
      expect(mockPrisma.shoppingListItem.deleteMany).toHaveBeenCalledWith({
        where: { shoppingListId: 'list-1', source: 'recipe' },
      })
      // Should create new recipe items with matchConfidence
      expect(mockPrisma.shoppingListItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'chicken breast', source: 'recipe', matchConfidence: 'unmatched' }),
          expect.objectContaining({ name: 'rice', source: 'recipe', matchConfidence: 'unmatched' }),
          expect.objectContaining({ name: 'soy sauce', source: 'recipe', matchConfidence: 'unmatched' }),
        ]),
      })
      // Should return listId and empty suggestions
      expect(result).toEqual({ listId: 'list-1', suggestions: [] })
      // Should reset stale flag
      expect(mockPrisma.shoppingList.update).toHaveBeenCalledWith({
        where: { id: 'list-1' },
        data: { stale: false },
      })
    })

    it('should not call createMany when there are no meal ingredients', async () => {
      const mockList = { id: 'list-1', items: [] }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.mealPlan.findMany.mockResolvedValue([])
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 })

      const result = await syncMealIngredients(new Date('2026-02-03'))

      expect(mockPrisma.shoppingListItem.deleteMany).toHaveBeenCalled()
      expect(mockPrisma.shoppingListItem.createMany).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('should create list with staples if none exists', async () => {
      const mockStaples = [{ id: 's1', name: 'Milk', type: 'staple', order: 0 }]
      const mockCreatedList = { id: 'new-list', items: [] }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(null)
      mockPrisma.masterListItem.findMany.mockResolvedValue(mockStaples)
      mockPrisma.shoppingList.create.mockResolvedValue(mockCreatedList)
      mockPrisma.mealPlan.findMany.mockResolvedValue([])
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 })

      await syncMealIngredients(new Date('2026-02-03'))

      expect(mockPrisma.shoppingList.create).toHaveBeenCalled()
    })

    it('should auto-match high-confidence embeddings and write mappings', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart, items: [] }
      const mockMealPlans = [
        {
          lunchRecipe: null,
          proteinRecipe: {
            name: 'Chicken Stir Fry',
            structuredIngredients: [
              { name: 'chicken breast' },
              { name: 'soy sauce' },
              { name: 'salt' },
            ],
          },
          carbRecipe: null,
          vegetableRecipe: null,
        },
      ]

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.mealPlan.findMany.mockResolvedValue(mockMealPlans)
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.shoppingListItem.createMany.mockResolvedValue({ count: 1 })

      // Master list has salt and soy sauce with normalisedName + embeddings
      mockPrisma.masterListItem.findMany.mockResolvedValue([
        { id: 'm1', name: 'Salt', normalisedName: 'salt', embedding: [0.1, 0.2], type: 'restock' },
        { id: 'm2', name: 'Soy Sauce', normalisedName: 'soy sauce', embedding: [0.3, 0.4], type: 'restock' },
      ])

      // Score ≥ 0.90: auto-match. Score < 0.50: unmatched. Score 0.50–0.89: suggestion.
      mockFindEmbeddingSuggestions.mockResolvedValue([
        { index: 0, name: 'chicken breast', matchedMasterItem: null, masterItemId: null, bestScore: 0.3, bestCandidate: 'salt' },
        { index: 1, name: 'soy sauce', matchedMasterItem: 'soy sauce', masterItemId: 'm2', bestScore: 0.95, bestCandidate: 'soy sauce' },
        { index: 2, name: 'salt', matchedMasterItem: 'salt', masterItemId: 'm1', bestScore: 0.99, bestCandidate: 'salt' },
      ])

      const result = await syncMealIngredients(weekStart)

      // Only chicken breast should remain (soy sauce and salt auto-matched at ≥0.90)
      expect(mockPrisma.shoppingListItem.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ name: 'chicken breast', source: 'recipe', matchConfidence: 'unmatched' }),
        ],
      })

      // Auto-matched items should write mappings
      expect(mockPrisma.ingredientMapping.upsert).toHaveBeenCalledTimes(2)

      // Should return empty suggestions (all were above auto threshold)
      expect(result.suggestions).toEqual([])
    })

    it('should surface medium-confidence matches as pending suggestions', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart, items: [] }
      const mockMealPlans = [
        {
          lunchRecipe: null,
          proteinRecipe: {
            name: 'Simple Recipe',
            structuredIngredients: [
              { name: 'garlic' },
              { name: 'olive oil' },
            ],
          },
          carbRecipe: null,
          vegetableRecipe: null,
        },
      ]

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.mealPlan.findMany.mockResolvedValue(mockMealPlans)
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.shoppingListItem.createMany.mockResolvedValue({ count: 2 })

      mockPrisma.masterListItem.findMany.mockResolvedValue([
        { id: 'm1', name: 'Garlic Granules', normalisedName: 'garlic (granules)', embedding: [0.1, 0.2], type: 'restock' },
        { id: 'm2', name: 'Olive Oil', normalisedName: 'olive oil', embedding: [0.3, 0.4], type: 'restock' },
      ])

      // garlic: 0.74 (suggestion band), olive oil: 0.92 (auto-match)
      mockFindEmbeddingSuggestions.mockResolvedValue([
        { index: 0, name: 'garlic', matchedMasterItem: 'garlic (granules)', masterItemId: 'm1', bestScore: 0.74, bestCandidate: 'garlic (granules)' },
        { index: 1, name: 'olive oil', matchedMasterItem: 'olive oil', masterItemId: 'm2', bestScore: 0.92, bestCandidate: 'olive oil' },
      ])

      const result = await syncMealIngredients(weekStart)

      // garlic should be written as pending with its score
      expect(mockPrisma.shoppingListItem.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ name: 'garlic', matchConfidence: 'pending', masterItemId: 'm1', similarityScore: 0.74 }),
        ],
      })

      // olive oil auto-matched — mapping written
      expect(mockPrisma.ingredientMapping.upsert).toHaveBeenCalledTimes(1)

      // Should return garlic as a suggestion
      expect(result.suggestions).toEqual([
        expect.objectContaining({
          ingredientName: 'garlic',
          suggestedMasterItemId: 'm1',
          score: 0.74,
        }),
      ])
    })

    it('should filter out previously rejected suggestions', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart, items: [] }
      const mockMealPlans = [
        {
          lunchRecipe: null,
          proteinRecipe: {
            name: 'Recipe',
            structuredIngredients: [{ name: 'garlic' }],
          },
          carbRecipe: null,
          vegetableRecipe: null,
        },
      ]

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.mealPlan.findMany.mockResolvedValue(mockMealPlans)
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.shoppingListItem.createMany.mockResolvedValue({ count: 1 })

      mockPrisma.masterListItem.findMany.mockResolvedValue([
        { id: 'm1', name: 'Garlic Granules', normalisedName: 'garlic (granules)', embedding: [0.1, 0.2], type: 'restock' },
      ])

      // garlic matches at 0.74 (suggestion band)
      mockFindEmbeddingSuggestions.mockResolvedValue([
        { index: 0, name: 'garlic', matchedMasterItem: 'garlic (granules)', masterItemId: 'm1', bestScore: 0.74, bestCandidate: 'garlic (granules)' },
      ])

      // But this pair was previously rejected
      mockPrisma.rejectedSuggestion.findMany.mockResolvedValue([
        { normalisedName: 'garlic', masterItemId: 'm1' },
      ])

      const result = await syncMealIngredients(weekStart)

      // garlic should be written as unmatched (not pending), no suggestion returned
      expect(mockPrisma.shoppingListItem.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ name: 'garlic', matchConfidence: 'unmatched' }),
        ],
      })
      expect(result.suggestions).toEqual([])
    })

    it('should include all items when embedding matching fails', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart, items: [] }
      const mockMealPlans = [
        {
          lunchRecipe: null,
          proteinRecipe: {
            name: 'Simple Recipe',
            structuredIngredients: [
              { name: 'chicken' },
              { name: 'salt' },
            ],
          },
          carbRecipe: null,
          vegetableRecipe: null,
        },
      ]

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.mealPlan.findMany.mockResolvedValue(mockMealPlans)
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.shoppingListItem.createMany.mockResolvedValue({ count: 2 })

      // Master list has items with normalisedName
      mockPrisma.masterListItem.findMany.mockResolvedValue([
        { id: 'm1', normalisedName: 'salt', embedding: [0.1, 0.2], type: 'restock' },
      ])

      // Embedding call fails
      mockFindEmbeddingSuggestions.mockRejectedValue(new Error('Embedding service unavailable'))

      await syncMealIngredients(weekStart)

      // All items should be written (no filtering on failure)
      expect(mockPrisma.shoppingListItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'chicken' }),
          expect.objectContaining({ name: 'salt' }),
        ]),
      })
    })

    it('should skip matching when no master list items have embeddings', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart, items: [] }
      const mockMealPlans = [
        {
          lunchRecipe: null,
          proteinRecipe: {
            name: 'Recipe',
            structuredIngredients: [{ name: 'chicken' }],
          },
          carbRecipe: null,
          vegetableRecipe: null,
        },
      ]

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.mealPlan.findMany.mockResolvedValue(mockMealPlans)
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.shoppingListItem.createMany.mockResolvedValue({ count: 1 })

      // Master list returns empty (no items with normalisedName + embeddings)
      mockPrisma.masterListItem.findMany.mockResolvedValue([])

      await syncMealIngredients(weekStart)

      expect(mockFindEmbeddingSuggestions).not.toHaveBeenCalled()
      expect(mockPrisma.shoppingListItem.createMany).toHaveBeenCalled()
    })

    it('should use explicit mappings to resolve ingredients before embedding match', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart, items: [] }
      const mockMealPlans = [
        {
          lunchRecipe: null,
          proteinRecipe: {
            name: 'Garlic Chicken',
            structuredIngredients: [
              { name: 'garlic cloves' },
              { name: 'chicken breast' },
            ],
          },
          carbRecipe: null,
          vegetableRecipe: null,
        },
      ]

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.mealPlan.findMany.mockResolvedValue(mockMealPlans)
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.shoppingListItem.createMany.mockResolvedValue({ count: 1 })

      // Explicit mapping: garlic cloves → master garlic item
      mockPrisma.ingredientMapping.findMany.mockResolvedValue([
        {
          id: 'map-1',
          recipeName: 'garlic cloves',
          masterItemId: 'm-garlic',
          confirmedCount: 3,
          masterItem: { id: 'm-garlic', name: 'Garlic', type: 'restock' },
        },
      ])

      await syncMealIngredients(weekStart)

      // Only chicken breast should remain (garlic resolved via explicit mapping)
      expect(mockPrisma.shoppingListItem.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ name: 'chicken breast', source: 'recipe', matchConfidence: 'unmatched' }),
        ],
      })
    })

    it('should dedup items with different normalisedName but same displayedName', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart, items: [] }
      // Two recipes each use parsley in a different form
      // "fresh parsley" → normalisedName: "parsley (fresh)", displayedName: "parsley"
      // "dried parsley"  → normalisedName: "parsley (dried)",  displayedName: "parsley"
      const mockMealPlans = [
        {
          lunchRecipe: null,
          proteinRecipe: {
            name: 'Chicken Salad',
            structuredIngredients: [{ name: 'fresh parsley' }],
          },
          carbRecipe: null,
          vegetableRecipe: null,
        },
        {
          lunchRecipe: null,
          proteinRecipe: {
            name: 'Pasta',
            structuredIngredients: [{ name: 'dried parsley' }],
          },
          carbRecipe: null,
          vegetableRecipe: null,
        },
      ]

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.mealPlan.findMany.mockResolvedValue(mockMealPlans)
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 })
      mockPrisma.shoppingListItem.createMany.mockResolvedValue({ count: 1 })

      await syncMealIngredients(weekStart)

      // Both forms should merge into a single "parsley" item
      const createCall = mockPrisma.shoppingListItem.createMany.mock.calls[0][0]
      const parsleyItems = createCall.data.filter((d: { name: string }) => d.name === 'parsley')
      expect(parsleyItems).toHaveLength(1)
      // The merged item should note both recipe sources
      expect(parsleyItems[0].notes).toContain('Chicken Salad')
      expect(parsleyItems[0].notes).toContain('Pasta')
    })
  })

  describe('includeMasterListItem', () => {
    it('should add a staple item to the shopping list', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart }
      const mockItem = {
        id: 'item-1',
        shoppingListId: 'list-1',
        name: 'Milk',
        checked: false,
        source: 'staple',
        order: 0,
      }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.shoppingListItem.findFirst.mockResolvedValue(null)
      mockPrisma.shoppingListItem.aggregate.mockResolvedValue({ _max: { order: null } })
      mockPrisma.shoppingListItem.create.mockResolvedValue(mockItem)

      const result = await includeMasterListItem(weekStart, 'master-1', 'Milk', 'staple')

      expect(mockPrisma.shoppingListItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          shoppingListId: 'list-1',
          name: 'Milk',
          source: 'staple',
          checked: false,
        }),
      })
      expect(result).toEqual(mockItem)
    })

    it('should add a restock item to the shopping list', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart }
      const mockItem = {
        id: 'item-1',
        name: 'Olive Oil',
        source: 'restock',
      }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.shoppingListItem.findFirst.mockResolvedValue(null)
      mockPrisma.shoppingListItem.aggregate.mockResolvedValue({ _max: { order: 5 } })
      mockPrisma.shoppingListItem.create.mockResolvedValue(mockItem)

      const result = await includeMasterListItem(weekStart, 'master-2', 'Olive Oil', 'restock')

      expect(mockPrisma.shoppingListItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Olive Oil',
          source: 'restock',
          order: 6,
        }),
      })
      expect(result).toEqual(mockItem)
    })

    it('should create shopping list if it does not exist', async () => {
      const weekStart = new Date('2026-02-03')
      const newList = { id: 'new-list', weekStart }
      const mockItem = { id: 'item-1', name: 'Milk' }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(null)
      mockPrisma.shoppingList.create.mockResolvedValue(newList)
      mockPrisma.shoppingListItem.findFirst.mockResolvedValue(null)
      mockPrisma.shoppingListItem.aggregate.mockResolvedValue({ _max: { order: null } })
      mockPrisma.shoppingListItem.create.mockResolvedValue(mockItem)

      await includeMasterListItem(weekStart, 'master-1', 'Milk', 'staple')

      expect(mockPrisma.shoppingList.create).toHaveBeenCalledWith({
        data: { weekStart: expect.any(Date) },
      })
    })

    it('should return existing item if already in list', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart }
      const existingItem = {
        id: 'existing-item',
        name: 'Milk',
        source: 'staple',
      }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.shoppingListItem.findFirst.mockResolvedValue(existingItem)

      const result = await includeMasterListItem(weekStart, 'master-1', 'Milk', 'staple')

      expect(mockPrisma.shoppingListItem.create).not.toHaveBeenCalled()
      expect(result).toEqual(existingItem)
    })
  })

  describe('excludeMasterListItem', () => {
    it('should remove a staple item from the shopping list', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart, items: [] }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 1 })

      const result = await excludeMasterListItem(weekStart, 'Milk', 'staple')

      expect(mockPrisma.shoppingListItem.deleteMany).toHaveBeenCalledWith({
        where: {
          shoppingListId: 'list-1',
          name: 'Milk',
          source: 'staple',
        },
      })
      expect(result).toBe(true)
    })

    it('should remove a restock item from the shopping list', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = { id: 'list-1', weekStart, items: [] }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 1 })

      const result = await excludeMasterListItem(weekStart, 'Olive Oil', 'restock')

      expect(mockPrisma.shoppingListItem.deleteMany).toHaveBeenCalledWith({
        where: {
          shoppingListId: 'list-1',
          name: 'Olive Oil',
          source: 'restock',
        },
      })
      expect(result).toBe(true)
    })

    it('should create list with staples if none exists, then exclude', async () => {
      const weekStart = new Date('2026-02-03')
      const mockStaples = [{ id: 's1', name: 'Milk', type: 'staple', order: 0 }]
      const mockCreatedList = { id: 'new-list', weekStart, items: [] }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(null)
      mockPrisma.masterListItem.findMany.mockResolvedValue(mockStaples)
      mockPrisma.shoppingList.create.mockResolvedValue(mockCreatedList)
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 1 })

      const result = await excludeMasterListItem(weekStart, 'Milk', 'staple')

      expect(mockPrisma.shoppingList.create).toHaveBeenCalled()
      expect(mockPrisma.shoppingListItem.deleteMany).toHaveBeenCalledWith({
        where: {
          shoppingListId: 'new-list',
          name: 'Milk',
          source: 'staple',
        },
      })
      expect(result).toBe(true)
    })

    it('should normalize weekStart to midnight', async () => {
      const weekStart = new Date('2026-02-03T15:30:00Z')
      const mockList = { id: 'list-1', items: [] }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 })

      await excludeMasterListItem(weekStart, 'Milk', 'staple')

      const calledDate = mockPrisma.shoppingList.findUnique.mock.calls[0][0].where.weekStart
      expect(calledDate.getHours()).toBe(0)
      expect(calledDate.getMinutes()).toBe(0)
    })
  })

  describe('addMasterListItem', () => {
    it('should create item, normalise, and compute embedding', async () => {
      const mockItem = { id: 'item-1', name: 'Sainsbury\'s Whole Milk 2L', type: 'staple', order: 0 }
      const mockEmbedding = [0.1, 0.2, 0.3]

      mockPrisma.masterListItem.aggregate.mockResolvedValue({ _max: { order: null } })
      mockPrisma.masterListItem.create.mockResolvedValue(mockItem)
      mockPrisma.masterListItem.update.mockResolvedValue({ ...mockItem, normalisedName: 'whole milk' })
      mockNormaliseMasterItems.mockResolvedValue([{ id: 'item-1', baseIngredient: 'whole milk' }])
      mockComputeEmbeddings.mockResolvedValue([mockEmbedding])

      const result = await addMasterListItem('cat-1', 'Sainsbury\'s Whole Milk 2L', 'staple')

      expect(mockNormaliseMasterItems).toHaveBeenCalledWith([{ id: 'item-1', name: 'Sainsbury\'s Whole Milk 2L' }])
      expect(mockComputeEmbeddings).toHaveBeenCalledWith(['whole milk'])
      expect(mockPrisma.masterListItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { normalisedName: 'whole milk', embedding: mockEmbedding },
      })
      expect(result).toEqual(mockItem)
    })

    it('should still create item when normalisation fails', async () => {
      const mockItem = { id: 'item-1', name: 'Milk', type: 'staple', order: 0 }

      mockPrisma.masterListItem.aggregate.mockResolvedValue({ _max: { order: null } })
      mockPrisma.masterListItem.create.mockResolvedValue(mockItem)
      mockNormaliseMasterItems.mockRejectedValue(new Error('AI service unavailable'))

      const result = await addMasterListItem('cat-1', 'Milk', 'staple')

      expect(mockPrisma.masterListItem.create).toHaveBeenCalled()
      expect(mockPrisma.masterListItem.update).not.toHaveBeenCalled()
      expect(result).toEqual(mockItem)
    })
  })

  describe('updateMasterListItem', () => {
    it('should update name, re-normalise, and recompute embedding', async () => {
      const mockItem = { id: 'item-1', name: 'Warburtons Wholemeal Bread 800g' }
      const mockEmbedding = [0.4, 0.5, 0.6]

      mockPrisma.masterListItem.update
        .mockResolvedValueOnce(mockItem) // name update
        .mockResolvedValueOnce({ ...mockItem, normalisedName: 'wholemeal bread' }) // normalisedName + embedding update
      mockNormaliseMasterItems.mockResolvedValue([{ id: 'item-1', baseIngredient: 'wholemeal bread' }])
      mockComputeEmbeddings.mockResolvedValue([mockEmbedding])

      const result = await updateMasterListItem('item-1', 'Warburtons Wholemeal Bread 800g')

      expect(mockPrisma.masterListItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { name: 'Warburtons Wholemeal Bread 800g' },
      })
      expect(mockNormaliseMasterItems).toHaveBeenCalledWith([{ id: 'item-1', name: 'Warburtons Wholemeal Bread 800g' }])
      expect(mockComputeEmbeddings).toHaveBeenCalledWith(['wholemeal bread'])
      expect(mockPrisma.masterListItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { normalisedName: 'wholemeal bread', embedding: mockEmbedding },
      })
      expect(result).toEqual(mockItem)
    })

    it('should still update name when normalisation fails', async () => {
      const mockItem = { id: 'item-1', name: 'New Name' }

      mockPrisma.masterListItem.update.mockResolvedValue(mockItem)
      mockNormaliseMasterItems.mockRejectedValue(new Error('AI service unavailable'))

      const result = await updateMasterListItem('item-1', 'New Name')

      expect(mockPrisma.masterListItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { name: 'New Name' },
      })
      expect(result).toEqual(mockItem)
    })
  })

  describe('deleteMasterListItem', () => {
    it('should delete the item', async () => {
      mockPrisma.masterListItem.delete.mockResolvedValue({ id: 'item-1' })

      const result = await deleteMasterListItem('item-1')

      expect(mockPrisma.masterListItem.delete).toHaveBeenCalledWith({
        where: { id: 'item-1' },
      })
      expect(result).toBe(true)
    })
  })

  describe('createIngredientMapping', () => {
    it('should create a new mapping via upsert', async () => {
      const mockMapping = {
        id: 'map-1',
        recipeName: 'garlic cloves',
        masterItemId: 'master-1',
        confirmedCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.ingredientMapping.upsert.mockResolvedValue(mockMapping)

      const result = await createIngredientMapping('Garlic Cloves', 'master-1')

      expect(mockPrisma.ingredientMapping.upsert).toHaveBeenCalledWith({
        where: {
          recipeName_masterItemId: { recipeName: 'garlic cloves', masterItemId: 'master-1' },
        },
        create: {
          recipeName: 'garlic cloves',
          masterItemId: 'master-1',
          confirmedCount: 1,
        },
        update: {
          confirmedCount: { increment: 1 },
        },
      })
      expect(result).toEqual(mockMapping)
    })

    it('should lowercase the recipeName', async () => {
      const mockMapping = {
        id: 'map-2',
        recipeName: 'fresh parsley',
        masterItemId: 'master-2',
        confirmedCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.ingredientMapping.upsert.mockResolvedValue(mockMapping)

      await createIngredientMapping('FRESH PARSLEY', 'master-2')

      expect(mockPrisma.ingredientMapping.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            recipeName_masterItemId: { recipeName: 'fresh parsley', masterItemId: 'master-2' },
          },
          create: expect.objectContaining({ recipeName: 'fresh parsley' }),
        })
      )
    })

    it('should increment confirmedCount on existing mapping', async () => {
      const mockMapping = {
        id: 'map-1',
        recipeName: 'garlic cloves',
        masterItemId: 'master-1',
        confirmedCount: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockPrisma.ingredientMapping.upsert.mockResolvedValue(mockMapping)

      const result = await createIngredientMapping('garlic cloves', 'master-1')

      expect(result.confirmedCount).toBe(3)
      expect(mockPrisma.ingredientMapping.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { confirmedCount: { increment: 1 } },
        })
      )
    })
  })
})
