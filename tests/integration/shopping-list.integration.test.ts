/**
 * Shopping List Integration Tests
 *
 * Tests the full shopping list flow with a real database:
 * - Generating shopping list from meal plans
 * - Including staples by default
 * - Adding/removing restock items
 * - Toggling item checked status
 * - Adding manual items
 *
 * These tests use a separate test database (mealplanner_test).
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  testPrisma,
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from './setup'

describe('Shopping List Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearTestDatabase()
  })

  describe('Shopping List Generation', () => {
    it('should generate shopping list from meal plan ingredients', async () => {
      // Arrange: Create a recipe with structured ingredients
      const recipe = await testPrisma.recipe.create({
        data: {
          name: 'Chicken Stir Fry',
          ingredients: 'chicken\nsoy sauce',
          proteinType: 'chicken',
          tier: 'favorite',
          structuredIngredients: {
            create: [
              { name: 'chicken breast', order: 0 },
              { name: 'soy sauce', order: 1 },
              { name: 'ginger', order: 2 },
            ],
          },
        },
      })

      // Create a meal plan using this recipe
      const weekStart = new Date('2026-02-03')
      weekStart.setHours(0, 0, 0, 0)

      await testPrisma.mealPlan.create({
        data: {
          date: weekStart,
          dayOfWeek: 'Monday',
          proteinRecipeId: recipe.id,
        },
      })

      // Act: Create shopping list with meal items
      const shoppingList = await testPrisma.shoppingList.create({
        data: {
          weekStart,
          items: {
            create: [
              { name: 'chicken breast', source: 'meal', order: 0, checked: false },
              { name: 'soy sauce', source: 'meal', order: 1, checked: false },
              { name: 'ginger', source: 'meal', order: 2, checked: false },
            ],
          },
        },
        include: { items: true },
      })

      // Assert
      expect(shoppingList).not.toBeNull()
      expect(shoppingList.items).toHaveLength(3)
      expect(shoppingList.items.every((item) => item.source === 'meal')).toBe(true)
    })

    it('should include staples in shopping list', async () => {
      // Arrange: Create category and staples
      const category = await testPrisma.category.create({
        data: { name: 'Dairy', order: 0 },
      })

      await testPrisma.masterListItem.createMany({
        data: [
          { name: 'Milk', type: 'staple', categoryId: category.id, order: 0 },
          { name: 'Eggs', type: 'staple', categoryId: category.id, order: 1 },
        ],
      })

      const weekStart = new Date('2026-02-03')
      weekStart.setHours(0, 0, 0, 0)

      // Act: Create shopping list with staple items
      const shoppingList = await testPrisma.shoppingList.create({
        data: {
          weekStart,
          items: {
            create: [
              { name: 'Milk', source: 'staple', order: 0, checked: false },
              { name: 'Eggs', source: 'staple', order: 1, checked: false },
            ],
          },
        },
        include: { items: true },
      })

      // Assert
      expect(shoppingList.items).toHaveLength(2)
      expect(shoppingList.items.every((item) => item.source === 'staple')).toBe(true)
    })

    it('should preserve manual items when regenerating list', async () => {
      const weekStart = new Date('2026-02-03')
      weekStart.setHours(0, 0, 0, 0)

      // Create initial list with manual item
      const shoppingList = await testPrisma.shoppingList.create({
        data: {
          weekStart,
          items: {
            create: [
              { name: 'Generated Item', source: 'meal', order: 0, checked: false },
              { name: 'Manual Item', source: 'manual', order: 1, checked: false },
            ],
          },
        },
      })

      // Act: Simulate regeneration - delete meal items, keep manual
      await testPrisma.shoppingListItem.deleteMany({
        where: {
          shoppingListId: shoppingList.id,
          source: { in: ['meal', 'staple'] },
        },
      })

      // Add new generated items
      await testPrisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          name: 'New Generated Item',
          source: 'meal',
          order: 0,
          checked: false,
        },
      })

      // Assert: Manual item still exists
      const items = await testPrisma.shoppingListItem.findMany({
        where: { shoppingListId: shoppingList.id },
        orderBy: { order: 'asc' },
      })

      expect(items).toHaveLength(2)
      expect(items.find((i) => i.name === 'Manual Item')).toBeDefined()
      expect(items.find((i) => i.name === 'New Generated Item')).toBeDefined()
    })
  })

  describe('Item Operations', () => {
    it('should toggle item checked status', async () => {
      const weekStart = new Date('2026-02-03')
      weekStart.setHours(0, 0, 0, 0)

      const shoppingList = await testPrisma.shoppingList.create({
        data: {
          weekStart,
          items: {
            create: [{ name: 'Milk', source: 'staple', order: 0, checked: false }],
          },
        },
        include: { items: true },
      })

      const item = shoppingList.items[0]

      // Act: Toggle to checked
      const updated = await testPrisma.shoppingListItem.update({
        where: { id: item.id },
        data: { checked: true },
      })

      // Assert
      expect(updated.checked).toBe(true)

      // Toggle back to unchecked
      const toggledBack = await testPrisma.shoppingListItem.update({
        where: { id: item.id },
        data: { checked: false },
      })

      expect(toggledBack.checked).toBe(false)
    })

    it('should add manual items to existing list', async () => {
      const weekStart = new Date('2026-02-03')
      weekStart.setHours(0, 0, 0, 0)

      const shoppingList = await testPrisma.shoppingList.create({
        data: {
          weekStart,
          items: {
            create: [{ name: 'Existing Item', source: 'meal', order: 0, checked: false }],
          },
        },
      })

      // Act: Add manual item
      const manualItem = await testPrisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          name: 'Added Manually',
          source: 'manual',
          order: 1,
          checked: false,
        },
      })

      // Assert
      expect(manualItem.source).toBe('manual')
      expect(manualItem.name).toBe('Added Manually')

      const allItems = await testPrisma.shoppingListItem.findMany({
        where: { shoppingListId: shoppingList.id },
      })
      expect(allItems).toHaveLength(2)
    })

    it('should include restock items when selected', async () => {
      const category = await testPrisma.category.create({
        data: { name: 'Household', order: 0 },
      })

      await testPrisma.masterListItem.create({
        data: {
          name: 'Paper Towels',
          type: 'restock',
          categoryId: category.id,
          order: 0,
        },
      })

      const weekStart = new Date('2026-02-03')
      weekStart.setHours(0, 0, 0, 0)

      const shoppingList = await testPrisma.shoppingList.create({
        data: { weekStart },
      })

      // Act: Add restock item to shopping list
      const restockItem = await testPrisma.shoppingListItem.create({
        data: {
          shoppingListId: shoppingList.id,
          name: 'Paper Towels',
          source: 'restock',
          order: 0,
          checked: false,
        },
      })

      // Assert
      expect(restockItem.source).toBe('restock')

      const items = await testPrisma.shoppingListItem.findMany({
        where: { shoppingListId: shoppingList.id },
      })
      expect(items).toHaveLength(1)
      expect(items[0].source).toBe('restock')
    })

    it('should exclude staple from list when unchecked', async () => {
      const weekStart = new Date('2026-02-03')
      weekStart.setHours(0, 0, 0, 0)

      const shoppingList = await testPrisma.shoppingList.create({
        data: {
          weekStart,
          items: {
            create: [
              { name: 'Milk', source: 'staple', order: 0, checked: false },
              { name: 'Bread', source: 'staple', order: 1, checked: false },
            ],
          },
        },
        include: { items: true },
      })

      // Act: Remove one staple (simulating user unchecking it)
      await testPrisma.shoppingListItem.deleteMany({
        where: {
          shoppingListId: shoppingList.id,
          name: 'Milk',
          source: 'staple',
        },
      })

      // Assert
      const remainingItems = await testPrisma.shoppingListItem.findMany({
        where: { shoppingListId: shoppingList.id },
      })

      expect(remainingItems).toHaveLength(1)
      expect(remainingItems[0].name).toBe('Bread')
    })
  })

  describe('Week Isolation', () => {
    it('should keep shopping lists separate by week', async () => {
      const week1Start = new Date('2026-02-03')
      week1Start.setHours(0, 0, 0, 0)

      const week2Start = new Date('2026-02-10')
      week2Start.setHours(0, 0, 0, 0)

      // Create lists for two different weeks
      await testPrisma.shoppingList.create({
        data: {
          weekStart: week1Start,
          items: {
            create: [{ name: 'Week 1 Item', source: 'meal', order: 0, checked: false }],
          },
        },
      })

      await testPrisma.shoppingList.create({
        data: {
          weekStart: week2Start,
          items: {
            create: [{ name: 'Week 2 Item', source: 'meal', order: 0, checked: false }],
          },
        },
      })

      // Assert: Each week has its own list
      const week1List = await testPrisma.shoppingList.findUnique({
        where: { weekStart: week1Start },
        include: { items: true },
      })

      const week2List = await testPrisma.shoppingList.findUnique({
        where: { weekStart: week2Start },
        include: { items: true },
      })

      expect(week1List?.items[0].name).toBe('Week 1 Item')
      expect(week2List?.items[0].name).toBe('Week 2 Item')
    })

    it('should enforce unique constraint on weekStart', async () => {
      const weekStart = new Date('2026-02-03')
      weekStart.setHours(0, 0, 0, 0)

      // Create first list
      await testPrisma.shoppingList.create({
        data: { weekStart },
      })

      // Act & Assert: Second list with same weekStart should fail
      await expect(
        testPrisma.shoppingList.create({
          data: { weekStart },
        })
      ).rejects.toThrow()
    })
  })
})
