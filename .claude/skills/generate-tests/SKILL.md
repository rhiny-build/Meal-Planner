---
name: generate-tests
description: Generate or update unit tests for a specified file or function
---

## When to Use

**New features** — generate comprehensive tests alongside the code.
**Fixes or updates** — review the existing test suite and modify or extend as required. Don't just add new tests, check if existing ones need updating.

## Testing Philosophy

- Unit tests are the primary focus — test utility functions and business logic in isolation
- Mock browser APIs and external dependencies
- Aim for >80% coverage on business logic
- Every edge case should have a test: empty arrays, invalid input, boundary conditions

## Framework and Patterns

Use Vitest. Follow Arrange-Act-Assert:

```typescript
it('should [expected behaviour] when [condition]', () => {
  // Arrange
  const input = ...

  // Act
  const result = ...

  // Assert
  expect(result).toBe(...)
})
```

Group related tests with nested `describe()` blocks.
Use descriptive test names — future you should understand what broke without reading the code.

## Running Tests

```bash
npm test                          # Run all tests once
npm run test:watch                # Watch mode
npm run test:coverage             # Coverage report
npm test -- lib/dateUtils.test.ts # Single file
```

## Hard Rule

Tests must pass before committing. If they fail after a change, fix the failure — do not comment out or delete tests to make the suite pass.