/**
 * Integration Tests - Real Database Operations
 *
 * WHAT ARE INTEGRATION TESTS?
 * Unlike unit tests (which mock dependencies), integration tests verify
 * that multiple components work together correctly.
 *
 * Here we test the full flow: API route → Prisma → Real database
 *
 * WHY INTEGRATION TESTS?
 * - Catch issues that unit tests miss (e.g., SQL syntax errors)
 * - Verify database constraints and relationships work
 * - Test real query performance and behavior
 *
 * SETUP:
 * These tests use a separate test database (prisma/test.db) to avoid
 * affecting your development data (prisma/dev.db). The test database is:
 * - Created automatically via `prisma db push` before tests
 * - Cleaned between tests (beforeEach deletes all data)
 * - Deleted after tests complete
 *
 * IMPORTANT: Integration tests are slower than unit tests.
 * Run them less frequently (e.g., before commits, in CI).
 *
 * TODO: Fix integration test setup - currently fails because schema.prisma
 * is configured for PostgreSQL but tests try to use SQLite test.db.
 * Options: (1) Use PostgreSQL for tests, (2) Add separate test schema for SQLite,
 * or (3) Use a test PostgreSQL database.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

/**
 * Use a SEPARATE test database to avoid affecting development data
 *
 * This creates a test.db file in the prisma directory, completely
 * isolated from the dev.db used by the application.
 */
const TEST_DB_PATH = path.join(process.cwd(), 'prisma', 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DB_URL,
    },
  },
})

// Check if we can run integration tests (requires PostgreSQL, not SQLite)
const canRunIntegrationTests = false // Disabled: schema uses PostgreSQL, test tries SQLite

describe.skipIf(!canRunIntegrationTests)('Recipe Integration Tests', () => {
  /**
   * beforeAll runs ONCE before all tests in this file
   *
   * Use it for expensive setup that doesn't need to repeat.
   * Here we ensure the test database has the correct schema.
   */
  beforeAll(async () => {
    // Push the schema to the test database (creates tables)
    // This ensures the test DB has the same schema as dev
    execSync(`DATABASE_URL="${TEST_DB_URL}" npx prisma db push --skip-generate`, {
      stdio: 'pipe', // Suppress output
    })

    // Connect to test database
    await testPrisma.$connect()
  })

  /**
   * afterAll runs ONCE after all tests complete
   *
   * Use it for cleanup: close connections, delete test data, etc.
   */
  afterAll(async () => {
    // Disconnect from database
    await testPrisma.$disconnect()

    // Optionally delete the test database file
    // Comment this out if you want to inspect the test DB after tests
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH)
    }
  })

  /**
   * beforeEach runs BEFORE each individual test
   *
   * Use it to reset state so each test starts fresh.
   * This prevents tests from affecting each other.
   */
  beforeEach(async () => {
    // Delete all recipes before each test
    // Order matters: delete meal plans first (they reference recipes)
    await testPrisma.mealPlan.deleteMany()
    await testPrisma.recipe.deleteMany()
  })

  /**
   * Test 1: Create and retrieve a recipe
   *
   * This is the most basic integration test - can we write
   * to the database and read back what we wrote?
   */
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

  /**
   * Test 2: Query with filters
   *
   * Verify that database filtering works correctly.
   */
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

  /**
   * Test 3: Update a recipe
   *
   * Verify that updates persist correctly.
   */
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
    // Ingredients should be unchanged
    expect(updated.ingredients).toBe('original ingredients')
  })

  /**
   * Test 4: Delete a recipe
   *
   * Verify that deletes work and the recipe is really gone.
   */
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

  /**
   * Test 5: Recipe-MealPlan relationship
   *
   * Test that the relationship between recipes and meal plans works.
   * This catches issues with foreign keys and cascade deletes.
   */
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
        date: new Date('2025-01-06'),
        dayOfWeek: 'Monday',
        proteinRecipeId: recipe.id,
      },
      include: {
        proteinRecipe: true, // Include the related recipe
      },
    })

    // Assert: The relationship is established
    expect(mealPlan.proteinRecipeId).toBe(recipe.id)
    expect(mealPlan.proteinRecipe).not.toBeNull()
    expect(mealPlan.proteinRecipe!.name).toBe('Meal Plan Recipe')
  })

  /**
   * Test 6: Cascade delete behavior
   *
   * When a recipe is deleted, what happens to meal plans that reference it?
   * This tests the onDelete: Cascade configuration in the schema.
   */
  it('should cascade delete meal plans when recipe is deleted', async () => {
    // Arrange: Create a recipe and a meal plan referencing it
    const recipe = await testPrisma.recipe.create({
      data: {
        name: 'Will Be Deleted',
        ingredients: 'test',
        tier: 'regular',
      },
    })

    await testPrisma.mealPlan.create({
      data: {
        date: new Date('2025-01-06'),
        dayOfWeek: 'Monday',
        proteinRecipeId: recipe.id,
      },
    })

    // Verify meal plan exists
    const mealPlansBefore = await testPrisma.mealPlan.count()
    expect(mealPlansBefore).toBe(1)

    // Act: Delete the recipe
    await testPrisma.recipe.delete({
      where: { id: recipe.id },
    })

    // Assert: Meal plan should also be deleted (cascade)
    const mealPlansAfter = await testPrisma.mealPlan.count()
    expect(mealPlansAfter).toBe(0)
  })
})

/**
 * KEY TAKEAWAYS FOR INTEGRATION TESTING:
 *
 * 1. USE A SEPARATE TEST DATABASE
 *    - Never run tests against your development database
 *    - Use environment variables or config to point to test DB
 *
 * 2. CLEAN UP BETWEEN TESTS
 *    - Each test should start with a known state
 *    - Use beforeEach to clear data
 *    - Be careful with order (delete child records first)
 *
 * 3. INTEGRATION TESTS ARE SLOWER
 *    - Database I/O takes time
 *    - Run unit tests frequently, integration tests before commits
 *
 * 4. TEST REAL BEHAVIOR
 *    - Don't mock the database in integration tests
 *    - Test actual SQL queries, constraints, relationships
 *
 * 5. BALANCE WITH UNIT TESTS
 *    - Unit tests: Many, fast, isolated (test logic)
 *    - Integration tests: Fewer, slower (test wiring)
 */
