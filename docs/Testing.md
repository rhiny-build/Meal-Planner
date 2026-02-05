# Testing Guide

This document describes the testing approach, structure, and commands for the Meal Planner application.

## Overview

The project uses **Vitest** as the test runner with two types of tests:

| Type | Purpose | Database | Speed |
|------|---------|----------|-------|
| Unit Tests | Test isolated functions/components with mocks | Mocked | Fast |
| Integration Tests | Test real database operations | Separate test DB | Slower |

## Test Commands

```bash
# Unit tests only (excludes integration tests)
npm test

# Unit tests in watch mode
npm run test:watch

# Unit tests with coverage report
npm run test:coverage

# Integration tests only (uses test database)
npm run test:integration

# All tests (unit + integration)
npm run test:all
```

## Directory Structure

```
/
├── lib/
│   ├── dateUtils.test.ts           # Pure function tests
│   ├── shoppingListHelpers.test.ts # Business logic tests
│   ├── ingredientParser.test.ts    # Parser tests
│   └── hooks/
│       ├── useMealPlan.test.ts     # Hook tests
│       └── useRecipes.test.ts      # Hook tests
├── app/
│   ├── (modules)/
│   │   └── shopping-list/
│   │       └── actions.test.ts     # Server action tests (mocked DB)
│   ├── api/
│   │   └── recipes/
│   │       └── recipes.test.ts     # API route tests
│   └── meal-plan/
│       └── components/
│           └── MealPlanDrawer.test.tsx  # Component tests
├── components/
│   └── RecipeCard.test.tsx         # Component tests
├── tests/
│   └── integration/
│       ├── setup.ts                # Test database utilities
│       ├── shopping-list.integration.test.ts
│       └── recipes.integration.test.ts
├── vitest.config.ts                # Vitest configuration
├── vitest.setup.ts                 # Global test setup
└── .env.test                       # Test database configuration
```

## Unit Tests

### Testing Pattern: Arrange-Act-Assert

All unit tests follow the AAA pattern:

```typescript
it('should do something', () => {
  // Arrange: Set up test data
  const input = { name: 'test' }

  // Act: Call the function
  const result = myFunction(input)

  // Assert: Verify the result
  expect(result).toBe('expected')
})
```

### Mocking Prisma

For server actions and API routes, we mock Prisma to avoid database dependencies:

```typescript
// Mock Prisma before imports
vi.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: vi.fn(),
      create: vi.fn(),
      // ... other methods
    },
  },
}))

// Import after mocking
import { myAction } from './actions'
import { prisma } from '@/lib/prisma'

// Type assertion for mocked prisma
const mockPrisma = prisma as unknown as {
  recipe: {
    findMany: ReturnType<typeof vi.fn>
    // ... other methods
  }
}

// Use in tests
it('should fetch recipes', async () => {
  mockPrisma.recipe.findMany.mockResolvedValue([{ id: '1', name: 'Test' }])

  const result = await myAction()

  expect(mockPrisma.recipe.findMany).toHaveBeenCalled()
  expect(result).toHaveLength(1)
})
```

### Mocking Next.js

For server actions that use `revalidatePath`:

```typescript
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
```

### Testing React Components

Use React Testing Library with jsdom environment:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MyComponent } from './MyComponent'

it('should render and respond to clicks', async () => {
  const onClickMock = vi.fn()

  render(<MyComponent onClick={onClickMock} />)

  const button = screen.getByRole('button', { name: /submit/i })
  fireEvent.click(button)

  expect(onClickMock).toHaveBeenCalled()
})
```

## Integration Tests

### Test Database Setup

Integration tests use a **separate PostgreSQL database** (`mealplanner_test`) to avoid affecting development data.

**Configuration:** `.env.test`
```
DATABASE_URL="postgresql://postgres:localdev@localhost:5432/mealplanner_test"
```

### Creating the Test Database

Before running integration tests for the first time:

```bash
# Create the test database (one-time setup)
psql "postgresql://postgres:localdev@localhost:5432/postgres" -c "CREATE DATABASE mealplanner_test;"

# Run migrations on test database
DATABASE_URL="postgresql://postgres:localdev@localhost:5432/mealplanner_test" npx prisma migrate deploy
```

### Test Database Utilities

Located in `tests/integration/setup.ts`:

```typescript
import { testPrisma, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'

describe('My Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase()  // Connect and run migrations
  })

  afterAll(async () => {
    await teardownTestDatabase()  // Disconnect
  })

  beforeEach(async () => {
    await clearTestDatabase()  // Clear all data between tests
  })

  it('should work with real database', async () => {
    const recipe = await testPrisma.recipe.create({
      data: { name: 'Test', ingredients: 'test', tier: 'regular' }
    })

    expect(recipe.id).toBeDefined()
  })
})
```

### What to Test in Integration Tests

Integration tests verify:
- Database constraints and relationships
- Cascade delete behavior
- Unique constraints
- Foreign key relationships
- Complex queries with joins/includes
- Transaction behavior

**Example: Testing cascade delete**
```typescript
it('should cascade delete ingredients when recipe is deleted', async () => {
  // Create recipe with ingredients
  const recipe = await testPrisma.recipe.create({
    data: {
      name: 'Test',
      ingredients: 'test',
      tier: 'regular',
      structuredIngredients: {
        create: [{ name: 'ingredient 1', order: 0 }],
      },
    },
  })

  // Verify ingredients exist
  const before = await testPrisma.ingredient.count({ where: { recipeId: recipe.id } })
  expect(before).toBe(1)

  // Delete recipe
  await testPrisma.recipe.delete({ where: { id: recipe.id } })

  // Verify ingredients are also deleted
  const after = await testPrisma.ingredient.count({ where: { recipeId: recipe.id } })
  expect(after).toBe(0)
})
```

### Running Integration Tests Sequentially

Integration tests run with `--no-file-parallelism` to prevent race conditions when multiple test files access the same database.

## Test Coverage

Current test counts:
- **Unit tests:** 132
- **Integration tests:** 18
- **Total:** 150

### Covered Areas

| Area | File | Tests |
|------|------|-------|
| Shopping List Actions | `actions.test.ts` | 18 |
| Shopping List Helpers | `shoppingListHelpers.test.ts` | 31 |
| Date Utilities | `dateUtils.test.ts` | 10 |
| Ingredient Parser | `ingredientParser.test.ts` | 12 |
| useMealPlan Hook | `useMealPlan.test.ts` | 16 |
| useRecipes Hook | `useRecipes.test.ts` | 11 |
| Recipe API | `recipes.test.ts` | 8 |
| RecipeCard Component | `RecipeCard.test.tsx` | 8 |
| MealPlanDrawer | `MealPlanDrawer.test.tsx` | 13 |
| AI Functions | `ai.test.ts` | 5 |
| Shopping List Integration | `shopping-list.integration.test.ts` | 9 |
| Recipe Integration | `recipes.integration.test.ts` | 9 |

## Best Practices

### Do

- Use descriptive test names: `should [expected behavior] when [condition]`
- Test edge cases (empty arrays, null values, boundary conditions)
- Clear mocks between tests with `beforeEach(() => vi.clearAllMocks())`
- Use `expect.objectContaining()` for partial object matching
- Keep tests focused on one behavior

### Don't

- Don't test implementation details (test behavior, not how it works)
- Don't share state between tests
- Don't use the dev database for integration tests
- Don't skip the `beforeEach` cleanup in integration tests

## Troubleshooting

### Integration tests fail with connection errors

Ensure PostgreSQL is running:
```bash
# If using Docker
docker ps  # Check if postgres container is running
```

### Tests fail due to schema mismatch

Run migrations on the test database:
```bash
DATABASE_URL="postgresql://postgres:localdev@localhost:5432/mealplanner_test" npx prisma migrate deploy
```

### Flaky integration tests

Check if tests are running in parallel. Integration tests should use `--no-file-parallelism`.

---

*Last updated: 2026-02-05*
