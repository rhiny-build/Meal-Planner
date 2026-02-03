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

// Mock Prisma - use factory function to avoid hoisting issues
vi.mock('@/lib/prisma', () => ({
  prisma: {
    shoppingList: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    shoppingListItem: {
      update: vi.fn(),
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    mealPlan: {
      findMany: vi.fn(),
    },
  },
}))

// Import after mocking
import { getShoppingList, toggleItem, addItem, generateShoppingList } from './actions'
import { prisma } from '@/lib/prisma'

// Type assertion for mocked prisma
const mockPrisma = prisma as unknown as {
  shoppingList: {
    findUnique: ReturnType<typeof vi.fn>
    upsert: ReturnType<typeof vi.fn>
  }
  shoppingListItem: {
    update: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    aggregate: ReturnType<typeof vi.fn>
  }
  mealPlan: {
    findMany: ReturnType<typeof vi.fn>
  }
}

describe('Shopping List Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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

  describe('generateShoppingList', () => {
    it('should generate a shopping list from meal plans', async () => {
      const weekStart = new Date('2026-02-03')
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
            structuredIngredients: [
              { name: 'rice' },
            ],
          },
          vegetableRecipe: null,
        },
      ]

      const mockList = {
        id: 'list-1',
        weekStart: new Date('2026-02-03'),
        items: [
          { id: 'item-1', name: 'chicken breast', source: 'meal' },
          { id: 'item-2', name: 'soy sauce', source: 'meal' },
          { id: 'item-3', name: 'rice', source: 'meal' },
        ],
      }

      mockPrisma.mealPlan.findMany.mockResolvedValue(mockMealPlans)
      mockPrisma.shoppingList.upsert.mockResolvedValue(mockList)

      const result = await generateShoppingList(weekStart)

      expect(mockPrisma.mealPlan.findMany).toHaveBeenCalled()
      expect(mockPrisma.shoppingList.upsert).toHaveBeenCalled()
      expect(result).toEqual(mockList)
    })

    it('should only delete meal-sourced items when regenerating', async () => {
      mockPrisma.mealPlan.findMany.mockResolvedValue([])
      mockPrisma.shoppingList.upsert.mockResolvedValue({ id: 'list-1', items: [] })

      await generateShoppingList(new Date('2026-02-03'))

      const upsertCall = mockPrisma.shoppingList.upsert.mock.calls[0][0]
      expect(upsertCall.update.items.deleteMany).toEqual({ source: 'meal' })
    })
  })
})
