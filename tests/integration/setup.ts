/**
 * Integration Test Database Setup
 *
 * Utilities for setting up and tearing down a test database.
 * Uses a separate PostgreSQL database to avoid affecting development data.
 */

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'

// Test database URL - separate from dev database
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  'postgresql://postgres:localdev@localhost:5432/mealplanner_test'

// Create a Prisma client for the test database
export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
})

/**
 * Set up the test database before running integration tests
 * - Creates the test database if it doesn't exist
 * - Runs migrations to set up schema
 */
export async function setupTestDatabase() {
  console.log('Setting up test database...')

  try {
    // Create the test database if it doesn't exist
    // We use the main postgres database to create the test db
    const mainDbUrl = TEST_DATABASE_URL.replace('/mealplanner_test', '/postgres')

    // Try to create the database (will fail silently if it exists)
    try {
      execSync(
        `psql "${mainDbUrl}" -c "CREATE DATABASE mealplanner_test;" 2>/dev/null`,
        { stdio: 'pipe' }
      )
      console.log('Created test database')
    } catch {
      // Database likely already exists, continue
    }

    // Run migrations on the test database
    execSync(`DATABASE_URL="${TEST_DATABASE_URL}" npx prisma migrate deploy`, {
      stdio: 'pipe',
    })
    console.log('Migrations applied to test database')

    // Connect to the test database
    await testPrisma.$connect()
    console.log('Connected to test database')
  } catch (error) {
    console.error('Failed to set up test database:', error)
    throw error
  }
}

/**
 * Clean up the test database after tests complete
 */
export async function teardownTestDatabase() {
  await testPrisma.$disconnect()
  console.log('Disconnected from test database')
}

/**
 * Clear all data from the test database
 * Use this in beforeEach to ensure tests start with a clean slate
 *
 * IMPORTANT: Order matters due to foreign key constraints
 */
export async function clearTestDatabase() {
  // Delete in order to respect foreign key constraints
  await testPrisma.shoppingListItem.deleteMany()
  await testPrisma.shoppingList.deleteMany()
  await testPrisma.mealPlan.deleteMany()
  await testPrisma.ingredient.deleteMany()
  await testPrisma.recipe.deleteMany()
  await testPrisma.masterListItem.deleteMany()
  await testPrisma.category.deleteMany()
}

/**
 * Seed test data for integration tests
 * Creates a minimal set of data for testing
 */
export async function seedTestData() {
  // Create a category
  const category = await testPrisma.category.create({
    data: {
      name: 'Test Category',
      order: 0,
    },
  })

  // Create some master list items
  await testPrisma.masterListItem.createMany({
    data: [
      { name: 'Milk', type: 'staple', categoryId: category.id, order: 0 },
      { name: 'Bread', type: 'staple', categoryId: category.id, order: 1 },
      { name: 'Olive Oil', type: 'restock', categoryId: category.id, order: 2 },
    ],
  })

  // Create a test recipe with structured ingredients
  const recipe = await testPrisma.recipe.create({
    data: {
      name: 'Test Chicken Recipe',
      ingredients: 'chicken breast\nsoy sauce\nrice',
      proteinType: 'chicken',
      carbType: 'rice',
      prepTime: 'quick',
      tier: 'favorite',
      structuredIngredients: {
        create: [
          { name: 'chicken breast', order: 0 },
          { name: 'soy sauce', order: 1 },
          { name: 'rice', order: 2 },
        ],
      },
    },
  })

  return { category, recipe }
}
