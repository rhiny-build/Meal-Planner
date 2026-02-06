/**
 * Settings Server Actions Tests
 *
 * Tests for the settings module server actions.
 * These tests mock Prisma and verify the business logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    masterListItem: {
      count: vi.fn(),
    },
    dishType: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    recipe: {
      count: vi.fn(),
    },
  },
}))

// Import after mocking
import {
  addCategory,
  updateCategory,
  deleteCategory,
  addDishType,
  updateDishType,
  deleteDishType,
} from './actions'
import { prisma } from '@/lib/prisma'

// Type assertion for mocked prisma
const mockPrisma = prisma as unknown as {
  category: {
    findUnique: ReturnType<typeof vi.fn>
    findFirst: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    aggregate: ReturnType<typeof vi.fn>
  }
  masterListItem: {
    count: ReturnType<typeof vi.fn>
  }
  dishType: {
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    aggregate: ReturnType<typeof vi.fn>
  }
  recipe: {
    count: ReturnType<typeof vi.fn>
  }
}

describe('Settings Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================
  // Category Management Tests
  // ============================================================

  describe('addCategory', () => {
    it('should create a new category', async () => {
      const mockCategory = { id: 'cat-1', name: 'Bakery', order: 0 }

      mockPrisma.category.findUnique.mockResolvedValue(null)
      mockPrisma.category.aggregate.mockResolvedValue({ _max: { order: null } })
      mockPrisma.category.create.mockResolvedValue(mockCategory)

      const result = await addCategory('Bakery')

      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: { name: 'Bakery', order: 0 },
      })
      expect(result).toEqual({ category: mockCategory })
    })

    it('should return error for empty name', async () => {
      const result = await addCategory('   ')

      expect(mockPrisma.category.create).not.toHaveBeenCalled()
      expect(result).toEqual({ error: 'Category name is required' })
    })

    it('should return error for duplicate name', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'existing', name: 'Bakery' })

      const result = await addCategory('Bakery')

      expect(mockPrisma.category.create).not.toHaveBeenCalled()
      expect(result).toEqual({ error: 'A category with this name already exists' })
    })

    it('should increment order based on existing categories', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null)
      mockPrisma.category.aggregate.mockResolvedValue({ _max: { order: 5 } })
      mockPrisma.category.create.mockResolvedValue({ id: 'cat-1', name: 'New', order: 6 })

      await addCategory('New')

      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: { name: 'New', order: 6 },
      })
    })

    it('should trim whitespace from name', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null)
      mockPrisma.category.aggregate.mockResolvedValue({ _max: { order: null } })
      mockPrisma.category.create.mockResolvedValue({ id: 'cat-1', name: 'Bakery', order: 0 })

      await addCategory('  Bakery  ')

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { name: 'Bakery' },
      })
    })
  })

  describe('updateCategory', () => {
    it('should update category name', async () => {
      const mockCategory = { id: 'cat-1', name: 'Fresh Bakery', order: 0 }

      mockPrisma.category.findFirst.mockResolvedValue(null)
      mockPrisma.category.update.mockResolvedValue(mockCategory)

      const result = await updateCategory('cat-1', 'Fresh Bakery')

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { name: 'Fresh Bakery' },
      })
      expect(result).toEqual({ category: mockCategory })
    })

    it('should return error for empty name', async () => {
      const result = await updateCategory('cat-1', '')

      expect(mockPrisma.category.update).not.toHaveBeenCalled()
      expect(result).toEqual({ error: 'Category name is required' })
    })

    it('should return error if name conflicts with another category', async () => {
      mockPrisma.category.findFirst.mockResolvedValue({ id: 'other-cat', name: 'Existing' })

      const result = await updateCategory('cat-1', 'Existing')

      expect(mockPrisma.category.update).not.toHaveBeenCalled()
      expect(result).toEqual({ error: 'A category with this name already exists' })
    })
  })

  describe('deleteCategory', () => {
    it('should delete category with no items', async () => {
      mockPrisma.masterListItem.count.mockResolvedValue(0)

      const result = await deleteCategory('cat-1')

      expect(mockPrisma.category.delete).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      })
      expect(result).toEqual({ success: true })
    })

    it('should return error if category has items', async () => {
      mockPrisma.masterListItem.count.mockResolvedValue(5)

      const result = await deleteCategory('cat-1')

      expect(mockPrisma.category.delete).not.toHaveBeenCalled()
      expect(result).toEqual({
        error: 'Cannot delete category with 5 items. Please move or delete all items first.',
      })
    })

    it('should use singular "item" for count of 1', async () => {
      mockPrisma.masterListItem.count.mockResolvedValue(1)

      const result = await deleteCategory('cat-1')

      expect(result).toEqual({
        error: 'Cannot delete category with 1 item. Please move or delete all items first.',
      })
    })
  })

  // ============================================================
  // Dish Type Management Tests
  // ============================================================

  describe('addDishType', () => {
    it('should create a new protein type', async () => {
      const mockDishType = { id: 'type-1', value: 'tofu', label: 'Tofu', category: 'protein', order: 0 }

      mockPrisma.dishType.findUnique.mockResolvedValue(null)
      mockPrisma.dishType.aggregate.mockResolvedValue({ _max: { order: null } })
      mockPrisma.dishType.create.mockResolvedValue(mockDishType)

      const result = await addDishType('protein', 'tofu', 'Tofu')

      expect(mockPrisma.dishType.create).toHaveBeenCalledWith({
        data: { value: 'tofu', label: 'Tofu', category: 'protein', order: 0 },
      })
      expect(result).toEqual({ dishType: mockDishType })
    })

    it('should create a new carb type', async () => {
      const mockDishType = { id: 'type-1', value: 'quinoa', label: 'Quinoa', category: 'carb', order: 0 }

      mockPrisma.dishType.findUnique.mockResolvedValue(null)
      mockPrisma.dishType.aggregate.mockResolvedValue({ _max: { order: null } })
      mockPrisma.dishType.create.mockResolvedValue(mockDishType)

      const result = await addDishType('carb', 'quinoa', 'Quinoa')

      expect(mockPrisma.dishType.create).toHaveBeenCalledWith({
        data: { value: 'quinoa', label: 'Quinoa', category: 'carb', order: 0 },
      })
      expect(result).toEqual({ dishType: mockDishType })
    })

    it('should return error for empty value or label', async () => {
      const result = await addDishType('protein', '', 'Tofu')

      expect(mockPrisma.dishType.create).not.toHaveBeenCalled()
      expect(result).toEqual({ error: 'Value and label are required' })
    })

    it('should return error for duplicate value within category', async () => {
      mockPrisma.dishType.findUnique.mockResolvedValue({ id: 'existing', value: 'tofu', category: 'protein' })

      const result = await addDishType('protein', 'tofu', 'Tofu')

      expect(mockPrisma.dishType.create).not.toHaveBeenCalled()
      expect(result).toEqual({ error: 'A protein type with this value already exists' })
    })

    it('should normalize value to lowercase and hyphenate spaces', async () => {
      mockPrisma.dishType.findUnique.mockResolvedValue(null)
      mockPrisma.dishType.aggregate.mockResolvedValue({ _max: { order: null } })
      mockPrisma.dishType.create.mockResolvedValue({ id: 'type-1', value: 'red-meat', label: 'Red Meat' })

      await addDishType('protein', 'Red Meat', 'Red Meat')

      expect(mockPrisma.dishType.findUnique).toHaveBeenCalledWith({
        where: { category_value: { category: 'protein', value: 'red-meat' } },
      })
    })

    it('should increment order based on existing types in category', async () => {
      mockPrisma.dishType.findUnique.mockResolvedValue(null)
      mockPrisma.dishType.aggregate.mockResolvedValue({ _max: { order: 3 } })
      mockPrisma.dishType.create.mockResolvedValue({ id: 'type-1', value: 'new', label: 'New', order: 4 })

      await addDishType('protein', 'new', 'New')

      expect(mockPrisma.dishType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ order: 4 }),
      })
    })
  })

  describe('updateDishType', () => {
    it('should update dish type label', async () => {
      const mockDishType = { id: 'type-1', value: 'chicken', label: 'Grilled Chicken', category: 'protein' }

      mockPrisma.dishType.update.mockResolvedValue(mockDishType)

      const result = await updateDishType('type-1', 'Grilled Chicken')

      expect(mockPrisma.dishType.update).toHaveBeenCalledWith({
        where: { id: 'type-1' },
        data: { label: 'Grilled Chicken' },
      })
      expect(result).toEqual({ dishType: mockDishType })
    })

    it('should return error for empty label', async () => {
      const result = await updateDishType('type-1', '   ')

      expect(mockPrisma.dishType.update).not.toHaveBeenCalled()
      expect(result).toEqual({ error: 'Label is required' })
    })

    it('should trim whitespace from label', async () => {
      mockPrisma.dishType.update.mockResolvedValue({ id: 'type-1', label: 'Chicken' })

      await updateDishType('type-1', '  Chicken  ')

      expect(mockPrisma.dishType.update).toHaveBeenCalledWith({
        where: { id: 'type-1' },
        data: { label: 'Chicken' },
      })
    })
  })

  describe('deleteDishType', () => {
    it('should delete dish type not used by any recipes', async () => {
      mockPrisma.dishType.findUnique.mockResolvedValue({
        id: 'type-1',
        value: 'tofu',
        category: 'protein',
      })
      mockPrisma.recipe.count.mockResolvedValue(0)

      const result = await deleteDishType('type-1')

      expect(mockPrisma.dishType.delete).toHaveBeenCalledWith({
        where: { id: 'type-1' },
      })
      expect(result).toEqual({ success: true })
    })

    it('should return error if dish type not found', async () => {
      mockPrisma.dishType.findUnique.mockResolvedValue(null)

      const result = await deleteDishType('nonexistent')

      expect(mockPrisma.dishType.delete).not.toHaveBeenCalled()
      expect(result).toEqual({ error: 'Dish type not found' })
    })

    it('should return error if protein type is used by recipes', async () => {
      mockPrisma.dishType.findUnique.mockResolvedValue({
        id: 'type-1',
        value: 'chicken',
        category: 'protein',
      })
      mockPrisma.recipe.count.mockResolvedValue(5)

      const result = await deleteDishType('type-1')

      expect(mockPrisma.recipe.count).toHaveBeenCalledWith({
        where: { proteinType: 'chicken' },
      })
      expect(mockPrisma.dishType.delete).not.toHaveBeenCalled()
      expect(result).toEqual({
        error: 'Cannot delete - 5 recipes use this protein type. Update those recipes first.',
      })
    })

    it('should return error if carb type is used by recipes', async () => {
      mockPrisma.dishType.findUnique.mockResolvedValue({
        id: 'type-1',
        value: 'rice',
        category: 'carb',
      })
      mockPrisma.recipe.count.mockResolvedValue(3)

      const result = await deleteDishType('type-1')

      expect(mockPrisma.recipe.count).toHaveBeenCalledWith({
        where: { carbType: 'rice' },
      })
      expect(mockPrisma.dishType.delete).not.toHaveBeenCalled()
      expect(result).toEqual({
        error: 'Cannot delete - 3 recipes use this carb type. Update those recipes first.',
      })
    })

    it('should use singular "recipe" for count of 1', async () => {
      mockPrisma.dishType.findUnique.mockResolvedValue({
        id: 'type-1',
        value: 'tofu',
        category: 'protein',
      })
      mockPrisma.recipe.count.mockResolvedValue(1)

      const result = await deleteDishType('type-1')

      expect(result).toEqual({
        error: 'Cannot delete - 1 recipe uses this protein type. Update those recipes first.',
      })
    })
  })
})
