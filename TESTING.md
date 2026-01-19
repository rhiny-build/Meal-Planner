# Testing Guide

This document explains the testing setup and patterns used in the Meal Planner app.

## Quick Start

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run a specific test file
npm test -- lib/dateUtils.test.ts

# Run tests matching a pattern
npm test -- --grep "dateUtils"
```

## Test Structure

Tests are **co-located** with their source files for easy discovery:

```
lib/
├── dateUtils.ts                  # Source file
├── dateUtils.test.ts             # Co-located test
└── ai/
    ├── extractIngredientsFromText.ts
    └── ai.test.ts                # AI layer tests (mocked)

components/
├── RecipeCard.tsx                # Source file
└── RecipeCard.test.tsx           # Co-located test

app/api/recipes/
├── route.ts                      # API route
└── recipes.test.ts               # API route tests (mocked database)

tests/                            # Non-co-located tests
└── integration/
    └── recipes.integration.test.ts  # Real database tests
```

**Why co-located tests?**
- Easy to find the test for any file
- Tests move automatically during refactoring
- Clear which files have test coverage

## Testing Philosophy

### Unit Tests vs Integration Tests

| Aspect | Unit Tests | Integration Tests |
|--------|-----------|------------------|
| **Speed** | Fast (milliseconds) | Slower (database I/O) |
| **Dependencies** | Mocked | Real |
| **Purpose** | Test logic in isolation | Test components work together |
| **When to run** | Every save (watch mode) | Before commits |

### The Testing Pyramid

```
       /\
      /  \      E2E Tests (few)
     /----\
    /      \    Integration Tests (some)
   /--------\
  /          \  Unit Tests (many)
 /------------\
```

- **Unit tests**: Most of your tests. Fast, isolated, test business logic.
- **Integration tests**: Fewer. Test database queries, API flows.
- **E2E tests**: Fewest. Test full user journeys (not implemented yet).

## Testing Patterns

### 1. Pure Functions (Easiest to Test)

Pure functions always return the same output for the same input. No mocking needed!

```typescript
// lib/dateUtils.ts
export const getMonday = (date: Date): Date => { ... }

// __tests__/lib/dateUtils.test.ts
it('should find Monday when input is Wednesday', () => {
  const wednesday = new Date('2025-01-08')
  const result = getMonday(wednesday)
  expect(result.getDate()).toBe(6) // Monday Jan 6
})
```

### 2. Mocking External Dependencies

When testing code that calls databases, APIs, or other services, mock those dependencies.

```typescript
// Mock Prisma before importing the route
vi.mock('@/lib/prisma', () => ({
  prisma: {
    recipe: {
      findMany: vi.fn(),
    },
  },
}))

// In test
vi.mocked(prisma.recipe.findMany).mockResolvedValue(mockRecipes)
```

### 3. Testing React Components

Use React Testing Library to test components like a user would interact with them.

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

it('should call onEdit when Edit button is clicked', async () => {
  const onEdit = vi.fn()
  const user = userEvent.setup()

  render(<RecipeCard recipe={recipe} onEdit={onEdit} onDelete={vi.fn()} />)

  await user.click(screen.getByRole('button', { name: /edit/i }))

  expect(onEdit).toHaveBeenCalledWith(recipe)
})
```

### 4. Testing AI/LLM Code

Mock the AI client to avoid real API calls (which are slow and cost money).

```typescript
vi.mock('@/lib/ai/client', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
}))

// Test successful response
vi.mocked(openai.chat.completions.create).mockResolvedValue({
  choices: [{ message: { content: '{"ingredients": "..."}' } }],
})

// Test error handling
vi.mocked(openai.chat.completions.create).mockRejectedValue(
  new Error('API rate limit')
)
```

### 5. Integration Tests with Real Database

Use a clean database state for each test.

```typescript
beforeEach(async () => {
  await prisma.mealPlan.deleteMany()
  await prisma.recipe.deleteMany()
})

it('should create and retrieve a recipe', async () => {
  const created = await prisma.recipe.create({ data: {...} })
  const retrieved = await prisma.recipe.findUnique({ where: { id: created.id } })
  expect(retrieved.name).toBe(created.name)
})
```

## Key Testing Concepts

### Arrange-Act-Assert Pattern

Every test should follow this structure:

```typescript
it('should do something', () => {
  // Arrange: Set up test data and mocks
  const input = 'test data'

  // Act: Call the function/component being tested
  const result = myFunction(input)

  // Assert: Verify the result
  expect(result).toBe('expected output')
})
```

### Common Assertions

```typescript
// Equality
expect(value).toBe(5)           // Strict equality
expect(obj).toEqual({ a: 1 })   // Deep equality

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeDefined()

// Arrays
expect(arr).toHaveLength(3)
expect(arr).toContain('item')

// Objects
expect(obj).toHaveProperty('key')
expect(obj).toMatchObject({ partial: 'match' })

// Functions
expect(fn).toHaveBeenCalled()
expect(fn).toHaveBeenCalledWith('arg')
expect(fn).toHaveBeenCalledTimes(2)

// Async
await expect(asyncFn()).resolves.toBe('value')
await expect(asyncFn()).rejects.toThrow('error')

// DOM (with @testing-library/jest-dom)
expect(element).toBeInTheDocument()
expect(element).toHaveTextContent('text')
expect(button).toBeDisabled()
```

### Mock Functions

```typescript
// Create a mock function
const mockFn = vi.fn()

// Set return value
mockFn.mockReturnValue('static value')
mockFn.mockResolvedValue('async value')  // For promises

// Check calls
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('expected', 'args')
expect(mockFn.mock.calls[0]).toEqual(['first', 'call', 'args'])

// Reset between tests
vi.clearAllMocks()  // Clear call history
vi.resetAllMocks()  // Clear history and implementations
```

## Configuration Files

### vitest.config.ts

```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',      // For React components
    setupFiles: ['./vitest.setup.ts'],
    globals: true,             // No need to import describe/it/expect
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
})
```

### vitest.setup.ts

```typescript
import '@testing-library/jest-dom/vitest'
// Adds custom matchers like toBeInTheDocument()
```

## Best Practices

1. **Test behavior, not implementation** - Don't test internal state or method names
2. **One assertion per test** (when practical) - Makes failures easier to diagnose
3. **Use descriptive test names** - `should return Monday when input is Wednesday`
4. **Keep tests independent** - Use `beforeEach` to reset state
5. **Don't test framework code** - Trust that React, Prisma, etc. work correctly
6. **Mock at the boundary** - Mock APIs and databases, not your own code

## Troubleshooting

### Test fails with "not defined"
Make sure `globals: true` is set in vitest.config.ts, or import from 'vitest':
```typescript
import { describe, it, expect } from 'vitest'
```

### Mock not working
- Ensure `vi.mock()` is called before importing the mocked module
- Use `vi.mocked()` for type-safe access to mock functions

### Component test can't find element
- Check that the element is actually rendered (use `screen.debug()`)
- Try different queries: `getByRole`, `getByText`, `getByTestId`
- For text split across elements, use a function matcher:
  ```typescript
  screen.getByText((content) => content.includes('partial'))
  ```

### Integration test pollution
- Use `beforeEach` to clean the database
- Delete child records before parent records (foreign key constraints)
