# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow

### Git Branching Strategy

1. **Starting New Work**
   - Before making any changes, create and checkout a feature branch: `git checkout -b feature_short_descriptive_name`
   - Feature branch names should be descriptive (e.g., `feature_category_management`, `fix_csv_import_bug`)

2. **Making Commits**
   - Commit frequently in small, logical chunks as you work. If unsure, ALWAYS ask the user for guidnace
   - Each commit should represent a single coherent change (e.g., "Add validation", "Fix bug in calculation")
   - **When to commit automatically (no need to ask)**:
     - After completing a well-defined subtask or feature component
     - After fixing a bug
     - After adding/updating tests
     - After refactoring code
     - Before switching to work on a different aspect of the feature
   - **When to ask before committing**:
     - When you're unsure if the current state is a good stopping point
     - When changes span multiple unrelated concerns
     - When the user is actively testing and might want to revert
   - Write clear, descriptive commit messages following this format:
     ```
     Short summary of change (imperative mood, 50 chars max)

     - Detailed explanation of what changed (if needed)
     - Why the change was made
     - Any important context or side effects

     🤖 Generated with [Claude Code](https://claude.com/claude-code)

     Co-Authored-By: Claude <noreply@anthropic.com>
     ```

3. **Completing Work**
   - When the feature is complete and tested, ask the user for approval to merge
   - After approval: merge back to main, complete any documentation updates, commit, and push to GitHub
   - Delete the feature branch after successful push: `git branch -d feature_branch_name`

### Commit Best Practices

- **Atomic commits**: Each commit should be a single, reversible unit of work
- **Test before committing**: Ensure code works and tests pass (if applicable)
- **Descriptive messages**: Future you (or others) should understand the commit without reading the diff
- **Don't commit broken code**: Every commit should leave the codebase in a working state

## Common Commands

### Development
```bash
# Start development server (with hot-reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Lint code
npm run lint
```

### Testing
```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run a single test file
npm test -- expenseUtils.test.ts
```

## Architecture

### Data Flow Pattern

### Component Hierarchy

## Key Files and Their Purposes

### Core Files

### API Routes

### Testing
## Important Patterns and Conventions

### State Management

### Data Immutability

### TypeScript Usage

### React Patterns

### Storage Service Pattern

## AI Categorization Feature

## Testing Philosophy

- **Unit Tests**: Test utility functions in isolation (primary focus)
- **Integration Tests**: Test component behavior with user interactions (future)
- **Mocking Strategy**: Mock browser APIs (localStorage, Blob, URL)
- **Test Coverage**: Aim for >80% coverage on business logic

### Writing Tests
- Use Arrange-Act-Assert pattern
- Test edge cases (empty arrays, invalid input, boundary conditions)
- Use descriptive test names: `should [expected behavior] when [condition]`
- Group related tests with nested `describe()` blocks

## Common Development Tasks

## Environment Variables

## Build and Deploy


## Browser Compatibility

## Gotchas and Edge Cases

## Code Style

- Use ESLint for code quality (`npm run lint`)
- Follow Next.js and React best practices
- Prefer functional components over class components
- Use arrow functions for consistency
- Keep components focused and small (<250 lines)
- Extract complex logic to utility functions

## Documentation

Comprehensive documentation available:

- **ARCHITECTURE.md**: Detailed architecture explanation (great for Java/C# developers)
- **GETTING_STARTED.md**: Setup guide and development workflow
- **TESTING.md**: Complete testing guide with examples
- **README.md**: User-facing documentation and feature list

ALWAYS: When adding features, on completion update relevant documentation files.
