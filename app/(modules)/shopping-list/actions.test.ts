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

// Mock AI ingredient matching
vi.mock('@/lib/ai/matchIngredients', () => ({
  matchIngredientsAgainstMasterList: vi.fn(),
}))

// Mock AI normalisation
vi.mock('@/lib/ai/normaliseIngredients', () => ({
  normaliseIngredients: vi.fn(),
}))

// Mock AI embeddings
vi.mock('@/lib/ai/embeddings', () => ({
  computeEmbeddings: vi.fn(),
}))

// Mock Prisma - use factory function to avoid hoisting issues
vi.mock('@/lib/prisma', () => ({
  prisma: {
    shoppingList: {
      findUnique: vi.fn(),
      create: vi.fn(),
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
} from './actions'
import { prisma } from '@/lib/prisma'
import { matchIngredientsAgainstMasterList } from '@/lib/ai/matchIngredients'
import { normaliseIngredients } from '@/lib/ai/normaliseIngredients'
import { computeEmbeddings } from '@/lib/ai/embeddings'

const mockMatchIngredients = matchIngredientsAgainstMasterList as ReturnType<typeof vi.fn>
const mockNormaliseIngredients = normaliseIngredients as ReturnType<typeof vi.fn>
const mockComputeEmbeddings = computeEmbeddings as ReturnType<typeof vi.fn>

// Type assertion for mocked prisma
const mockPrisma = prisma as unknown as {
  shoppingList: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
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
}

describe('Shopping List Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: empty master list means no AI call and no filtering
    mockPrisma.masterListItem.findMany.mockResolvedValue([])
    // Default: return a fake embedding vector for any input
    mockComputeEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3]])
  })

  describe('getShoppingList', () => {
    it('should fetch shopping list for a week', async () => {
      const weekStart = new Date('2026-02-03')
      const mockList = {
        id: 'list-1',
        weekStart: new Date('2026-02-03'),
        items: [
          { id: 'item-1', name: 'Milk', checked: false, source: 'staple', order: 0 },
          { id: 'item-2', name: 'Chicken', checked: false, source: 'meal', order: 1 },
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

      await syncMealIngredients(weekStart)

      // Should delete old meal items
      expect(mockPrisma.shoppingListItem.deleteMany).toHaveBeenCalledWith({
        where: { shoppingListId: 'list-1', source: 'meal' },
      })
      // Should create new meal items
      expect(mockPrisma.shoppingListItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'chicken breast', source: 'meal', shoppingListId: 'list-1' }),
          expect.objectContaining({ name: 'rice', source: 'meal', shoppingListId: 'list-1' }),
          expect.objectContaining({ name: 'soy sauce', source: 'meal', shoppingListId: 'list-1' }),
        ]),
      })
    })

    it('should not call createMany when there are no meal ingredients', async () => {
      const mockList = { id: 'list-1', items: [] }

      mockPrisma.shoppingList.findUnique.mockResolvedValue(mockList)
      mockPrisma.mealPlan.findMany.mockResolvedValue([])
      mockPrisma.shoppingListItem.deleteMany.mockResolvedValue({ count: 0 })

      await syncMealIngredients(new Date('2026-02-03'))

      expect(mockPrisma.shoppingListItem.deleteMany).toHaveBeenCalled()
      expect(mockPrisma.shoppingListItem.createMany).not.toHaveBeenCalled()
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

    it('should filter out ingredients matching master list via embedding matching', async () => {
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

      // Master list has salt and soy sauce with embeddings
      mockPrisma.masterListItem.findMany
        .mockResolvedValueOnce([
          { baseIngredient: 'salt', embedding: [0.1, 0.2] },
          { baseIngredient: 'soy sauce', embedding: [0.3, 0.4] },
        ])
        .mockResolvedValue([])

      // Embedding matching: soy sauce and salt matched, not chicken
      mockMatchIngredients.mockResolvedValue([
        { index: 0, name: 'chicken breast', baseIngredient: 'chicken', matchedMasterItem: null },
        { index: 1, name: 'soy sauce', baseIngredient: 'soy sauce', matchedMasterItem: 'soy sauce' },
        { index: 2, name: 'salt', baseIngredient: 'salt', matchedMasterItem: 'salt' },
      ])

      await syncMealIngredients(weekStart)

      // Only chicken breast should remain
      expect(mockPrisma.shoppingListItem.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ name: 'chicken breast', source: 'meal' }),
        ],
      })
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

      mockPrisma.masterListItem.findMany
        .mockResolvedValueOnce([{ baseIngredient: 'salt', embedding: [0.1, 0.2] }])
        .mockResolvedValue([])

      // Embedding call fails
      mockMatchIngredients.mockRejectedValue(new Error('Embedding service unavailable'))

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

      // Master list returns empty (no items with embeddings)
      mockPrisma.masterListItem.findMany.mockResolvedValue([])

      await syncMealIngredients(weekStart)

      expect(mockMatchIngredients).not.toHaveBeenCalled()
      expect(mockPrisma.shoppingListItem.createMany).toHaveBeenCalled()
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
    it('should create item, normalise baseIngredient, and compute embedding', async () => {
      const mockItem = { id: 'item-1', name: 'Sainsbury\'s Whole Milk 2L', type: 'staple', order: 0 }
      const mockEmbedding = [0.1, 0.2, 0.3]

      mockPrisma.masterListItem.aggregate.mockResolvedValue({ _max: { order: null } })
      mockPrisma.masterListItem.create.mockResolvedValue(mockItem)
      mockPrisma.masterListItem.update.mockResolvedValue({ ...mockItem, baseIngredient: 'whole milk' })
      mockNormaliseIngredients.mockResolvedValue([{ id: 'item-1', baseIngredient: 'whole milk' }])
      mockComputeEmbeddings.mockResolvedValue([mockEmbedding])

      const result = await addMasterListItem('cat-1', 'Sainsbury\'s Whole Milk 2L', 'staple')

      expect(mockNormaliseIngredients).toHaveBeenCalledWith([{ id: 'item-1', name: 'Sainsbury\'s Whole Milk 2L' }])
      expect(mockComputeEmbeddings).toHaveBeenCalledWith(['whole milk'])
      expect(mockPrisma.masterListItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { baseIngredient: 'whole milk', embedding: mockEmbedding },
      })
      expect(result).toEqual(mockItem)
    })

    it('should still create item when normalisation fails', async () => {
      const mockItem = { id: 'item-1', name: 'Milk', type: 'staple', order: 0 }

      mockPrisma.masterListItem.aggregate.mockResolvedValue({ _max: { order: null } })
      mockPrisma.masterListItem.create.mockResolvedValue(mockItem)
      mockNormaliseIngredients.mockRejectedValue(new Error('AI service unavailable'))

      const result = await addMasterListItem('cat-1', 'Milk', 'staple')

      expect(mockPrisma.masterListItem.create).toHaveBeenCalled()
      expect(mockPrisma.masterListItem.update).not.toHaveBeenCalled()
      expect(result).toEqual(mockItem)
    })
  })

  describe('updateMasterListItem', () => {
    it('should update name, re-normalise baseIngredient, and recompute embedding', async () => {
      const mockItem = { id: 'item-1', name: 'Warburtons Wholemeal Bread 800g' }
      const mockEmbedding = [0.4, 0.5, 0.6]

      mockPrisma.masterListItem.update
        .mockResolvedValueOnce(mockItem) // name update
        .mockResolvedValueOnce({ ...mockItem, baseIngredient: 'wholemeal bread' }) // baseIngredient + embedding update
      mockNormaliseIngredients.mockResolvedValue([{ id: 'item-1', baseIngredient: 'wholemeal bread' }])
      mockComputeEmbeddings.mockResolvedValue([mockEmbedding])

      const result = await updateMasterListItem('item-1', 'Warburtons Wholemeal Bread 800g')

      expect(mockPrisma.masterListItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { name: 'Warburtons Wholemeal Bread 800g' },
      })
      expect(mockNormaliseIngredients).toHaveBeenCalledWith([{ id: 'item-1', name: 'Warburtons Wholemeal Bread 800g' }])
      expect(mockComputeEmbeddings).toHaveBeenCalledWith(['wholemeal bread'])
      expect(mockPrisma.masterListItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { baseIngredient: 'wholemeal bread', embedding: mockEmbedding },
      })
      expect(result).toEqual(mockItem)
    })

    it('should still update name when normalisation fails', async () => {
      const mockItem = { id: 'item-1', name: 'New Name' }

      mockPrisma.masterListItem.update.mockResolvedValue(mockItem)
      mockNormaliseIngredients.mockRejectedValue(new Error('AI service unavailable'))

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
})
