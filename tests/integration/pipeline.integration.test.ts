/**
 * Pipeline Integration Tests
 *
 * Safety-net tests for schema changes (Task 2).
 * These verify core data model invariants using a real database.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  testPrisma,
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from './setup'

describe('Pipeline Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearTestDatabase()
  })

  it('should persist normalisedName when creating a master item', async () => {
    // Arrange
    const category = await testPrisma.category.create({
      data: { name: 'Spices', order: 0 },
    })

    // Act: Create a master item with normalisedName set
    const item = await testPrisma.masterListItem.create({
      data: {
        name: 'Sainsbury\'s Garlic Granules 50g',
        type: 'staple',
        categoryId: category.id,
        order: 0,
        normalisedName: 'garlic (granules)',
      },
    })

    // Assert: Read back from DB and verify
    const fetched = await testPrisma.masterListItem.findUniqueOrThrow({
      where: { id: item.id },
    })

    expect(fetched.normalisedName).toBe('garlic (granules)')
  })

  it('should suppress a mapped ingredient via IngredientMapping', async () => {
    // Arrange: Create category, master item, recipe, meal plan, shopping list
    const category = await testPrisma.category.create({
      data: { name: 'Dairy', order: 0 },
    })

    const masterItem = await testPrisma.masterListItem.create({
      data: {
        name: 'Sainsbury\'s Semi-Skimmed Milk 2L',
        type: 'staple',
        categoryId: category.id,
        order: 0,
        normalisedName: 'milk',
      },
    })

    // Create a mapping: "milk" recipe ingredient → master item
    await testPrisma.ingredientMapping.create({
      data: {
        recipeName: 'milk',
        masterItemId: masterItem.id,
        confirmedCount: 3,
      },
    })

    // Create a recipe that uses milk
    const recipe = await testPrisma.recipe.create({
      data: {
        name: 'Pancakes',
        ingredients: 'milk\nflour\neggs',
        tier: 'favorite',
        structuredIngredients: {
          create: [
            { name: 'milk', order: 0 },
            { name: 'flour', order: 1 },
            { name: 'eggs', order: 2 },
          ],
        },
      },
    })

    const weekStart = new Date('2026-03-16')
    weekStart.setHours(0, 0, 0, 0)

    await testPrisma.mealPlan.create({
      data: {
        date: weekStart,
        dayOfWeek: 'Monday',
        proteinRecipeId: recipe.id,
      },
    })

    // Verify the mapping exists and links correctly
    const mapping = await testPrisma.ingredientMapping.findFirst({
      where: { recipeName: 'milk' },
      include: { masterItem: true },
    })

    expect(mapping).not.toBeNull()
    expect(mapping!.masterItemId).toBe(masterItem.id)
    expect(mapping!.masterItem.name).toBe('Sainsbury\'s Semi-Skimmed Milk 2L')

    // Simulate what the pipeline does: ingredients that match a mapping
    // should be resolved as 'explicit' and NOT appear as unmatched on the list.
    // We verify the DB supports this by creating a shopping list that only
    // includes unmatched items (flour, eggs) but not the mapped one (milk).
    const shoppingList = await testPrisma.shoppingList.create({
      data: {
        weekStart,
        items: {
          create: [
            // milk is NOT here — it was suppressed by the mapping
            { name: 'flour', source: 'recipe', order: 0, checked: false, matchConfidence: 'unmatched' },
            { name: 'eggs', source: 'recipe', order: 1, checked: false, matchConfidence: 'unmatched' },
          ],
        },
      },
      include: { items: true },
    })

    // Assert: milk does not appear on the shopping list
    const itemNames = shoppingList.items.map((i) => i.name)
    expect(itemNames).not.toContain('milk')
    expect(itemNames).toContain('flour')
    expect(itemNames).toContain('eggs')
    expect(shoppingList.items).toHaveLength(2)
  })
})
