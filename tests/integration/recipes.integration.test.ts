/**
 * Recipe Integration Tests
 *
 * Tests the full recipe CRUD flow with a real database:
 * - Creating recipes with structured ingredients
 * - Querying and filtering recipes
 * - Updating recipes
 * - Deleting recipes (with cascade behavior)
 * - Recipe-MealPlan relationships
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

describe('Recipe Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  beforeEach(async () => {
    await clearTestDatabase()
  })

  describe('Recipe CRUD Operations', () => {
    it('should create a recipe and retrieve it by ID', async () => {
      // Arrange & Act: Create a recipe
      const created = await testPrisma.recipe.create({
        data: {
          name: 'Integration Test Recipe',
          ingredients: 'test ingredient 1\ntest ingredient 2',
          proteinType: 'chicken',
          carbType: 'rice',
          prepTime: 'quick',
          tier: 'favorite',
        },
      })

      // Act: Retrieve the recipe by ID
      const retrieved = await testPrisma.recipe.findUnique({
        where: { id: created.id },
      })

      // Assert: The retrieved recipe matches what we created
      expect(retrieved).not.toBeNull()
      expect(retrieved!.name).toBe('Integration Test Recipe')
      expect(retrieved!.proteinType).toBe('chicken')
      expect(retrieved!.tier).toBe('favorite')
    })

    it('should filter recipes by protein type', async () => {
      // Arrange: Create multiple recipes with different protein types
      await testPrisma.recipe.createMany({
        data: [
          {
            name: 'Chicken Dish',
            ingredients: 'chicken',
            proteinType: 'chicken',
            tier: 'favorite',
          },
          {
            name: 'Fish Dish',
            ingredients: 'salmon',
            proteinType: 'fish',
            tier: 'favorite',
          },
          {
            name: 'Another Chicken',
            ingredients: 'chicken thighs',
            proteinType: 'chicken',
            tier: 'regular',
          },
        ],
      })

      // Act: Query for only chicken recipes
      const chickenRecipes = await testPrisma.recipe.findMany({
        where: { proteinType: 'chicken' },
      })

      // Assert: Should find exactly 2 chicken recipes
      expect(chickenRecipes).toHaveLength(2)
      expect(chickenRecipes.every((r) => r.proteinType === 'chicken')).toBe(true)
    })

    it('should update a recipe', async () => {
      // Arrange: Create a recipe
      const created = await testPrisma.recipe.create({
        data: {
          name: 'Original Name',
          ingredients: 'original ingredients',
          tier: 'regular',
        },
      })

      // Act: Update the recipe
      const updated = await testPrisma.recipe.update({
        where: { id: created.id },
        data: {
          name: 'Updated Name',
          tier: 'favorite',
        },
      })

      // Assert: Changes persisted
      expect(updated.name).toBe('Updated Name')
      expect(updated.tier).toBe('favorite')
      expect(updated.ingredients).toBe('original ingredients')
    })

    it('should delete a recipe', async () => {
      // Arrange: Create a recipe
      const created = await testPrisma.recipe.create({
        data: {
          name: 'To Be Deleted',
          ingredients: 'soon gone',
          tier: 'regular',
        },
      })

      // Verify it exists
      const beforeDelete = await testPrisma.recipe.findUnique({
        where: { id: created.id },
      })
      expect(beforeDelete).not.toBeNull()

      // Act: Delete the recipe
      await testPrisma.recipe.delete({
        where: { id: created.id },
      })

      // Assert: Recipe is gone
      const afterDelete = await testPrisma.recipe.findUnique({
        where: { id: created.id },
      })
      expect(afterDelete).toBeNull()
    })
  })

  describe('Recipe with Structured Ingredients', () => {
    it('should create recipe with structured ingredients', async () => {
      // Act: Create recipe with nested ingredients
      const recipe = await testPrisma.recipe.create({
        data: {
          name: 'Recipe with Ingredients',
          ingredients: 'chicken\nrice\nsoy sauce',
          tier: 'favorite',
          structuredIngredients: {
            create: [
              { name: 'chicken breast', quantity: '2', unit: 'lbs', order: 0 },
              { name: 'rice', quantity: '1', unit: 'cup', order: 1 },
              { name: 'soy sauce', quantity: '2', unit: 'tbsp', order: 2 },
            ],
          },
        },
        include: { structuredIngredients: true },
      })

      // Assert
      expect(recipe.structuredIngredients).toHaveLength(3)
      expect(recipe.structuredIngredients[0].name).toBe('chicken breast')
      expect(recipe.structuredIngredients[0].quantity).toBe('2')
    })

    it('should cascade delete ingredients when recipe is deleted', async () => {
      // Arrange: Create recipe with ingredients
      const recipe = await testPrisma.recipe.create({
        data: {
          name: 'Recipe to Delete',
          ingredients: 'test',
          tier: 'regular',
          structuredIngredients: {
            create: [
              { name: 'ingredient 1', order: 0 },
              { name: 'ingredient 2', order: 1 },
            ],
          },
        },
      })

      // Verify ingredients exist
      const ingredientsBefore = await testPrisma.ingredient.count({
        where: { recipeId: recipe.id },
      })
      expect(ingredientsBefore).toBe(2)

      // Act: Delete the recipe
      await testPrisma.recipe.delete({
        where: { id: recipe.id },
      })

      // Assert: Ingredients are also deleted
      const ingredientsAfter = await testPrisma.ingredient.count({
        where: { recipeId: recipe.id },
      })
      expect(ingredientsAfter).toBe(0)
    })
  })

  describe('Recipe-MealPlan Relationship', () => {
    it('should link a recipe to a meal plan', async () => {
      // Arrange: Create a recipe
      const recipe = await testPrisma.recipe.create({
        data: {
          name: 'Meal Plan Recipe',
          ingredients: 'various',
          proteinType: 'chicken',
          tier: 'favorite',
        },
      })

      // Act: Create a meal plan that references the recipe
      const mealPlan = await testPrisma.mealPlan.create({
        data: {
          date: new Date('2026-02-03'),
          dayOfWeek: 'Monday',
          proteinRecipeId: recipe.id,
        },
        include: {
          proteinRecipe: true,
        },
      })

      // Assert: The relationship is established
      expect(mealPlan.proteinRecipeId).toBe(recipe.id)
      expect(mealPlan.proteinRecipe).not.toBeNull()
      expect(mealPlan.proteinRecipe!.name).toBe('Meal Plan Recipe')
    })

    it('should support multiple recipe types in one meal plan', async () => {
      // Arrange: Create multiple recipes
      const protein = await testPrisma.recipe.create({
        data: { name: 'Grilled Chicken', ingredients: 'chicken', tier: 'favorite' },
      })
      const carb = await testPrisma.recipe.create({
        data: { name: 'Rice Pilaf', ingredients: 'rice', tier: 'favorite' },
      })
      const vegetable = await testPrisma.recipe.create({
        data: { name: 'Green Salad', ingredients: 'lettuce', tier: 'regular' },
      })

      // Act: Create meal plan with all three
      const mealPlan = await testPrisma.mealPlan.create({
        data: {
          date: new Date('2026-02-03'),
          dayOfWeek: 'Monday',
          proteinRecipeId: protein.id,
          carbRecipeId: carb.id,
          vegetableRecipeId: vegetable.id,
        },
        include: {
          proteinRecipe: true,
          carbRecipe: true,
          vegetableRecipe: true,
        },
      })

      // Assert
      expect(mealPlan.proteinRecipe?.name).toBe('Grilled Chicken')
      expect(mealPlan.carbRecipe?.name).toBe('Rice Pilaf')
      expect(mealPlan.vegetableRecipe?.name).toBe('Green Salad')
    })

    it('should cascade delete meal plan when recipe is deleted', async () => {
      // Arrange: Create recipe and meal plan
      const recipe = await testPrisma.recipe.create({
        data: { name: 'To Delete', ingredients: 'test', tier: 'regular' },
      })

      const mealPlan = await testPrisma.mealPlan.create({
        data: {
          date: new Date('2026-02-03'),
          dayOfWeek: 'Monday',
          proteinRecipeId: recipe.id,
        },
      })

      // Verify meal plan exists
      const mealPlanBefore = await testPrisma.mealPlan.findUnique({
        where: { id: mealPlan.id },
      })
      expect(mealPlanBefore).not.toBeNull()

      // Act: Delete the recipe
      await testPrisma.recipe.delete({
        where: { id: recipe.id },
      })

      // Assert: Meal plan is also deleted (cascade behavior per schema)
      const mealPlanAfter = await testPrisma.mealPlan.findUnique({
        where: { id: mealPlan.id },
      })

      expect(mealPlanAfter).toBeNull()
    })
  })
})
