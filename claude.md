# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## User Interaction

Always try not to overwhelm the user. Remember that most users will need a bit of time to digest your repsonse so whenever it is a big response (as a guideline more than 3 paragraphs), break it down and ask the user whether it's ok to continue or they wish to discuss. Likewise, when you have multiple questions to ask (again more than 2 or 3) state that you have a few questions and engage with the user one questions at a time.

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
   - When the feature is complete and tested, ask the user to run /push-to-prod and folllow the directions there. Comments below here are for historic reference. If you're unclear, ask the user.
   - After approval: merge back to main, complete any documentation updates, commit, and push to GitHub
   - Delete the feature branch after successful push: `git branch -d feature_branch_name`

### Commit Best Practices

- **Atomic commits**: Each commit should be a single, reversible unit of work
- **Test before committing**: Ensure code works and tests pass (if applicable)
- **Descriptive messages**: Future you (or others) should understand the commit without reading the diff
- **Don't commit broken code**: Every commit should leave the codebase in a working state

## Planning Features

When planning bigger features (multi-file changes, new modules, refactors), follow this approach:

### 1. Structure Work in Phases

Break the work into small, end-to-end milestones. Each phase must have:

- **Clear outcome**: What can the user do at the end that they couldn't before? (Not just "code is written" but "user can X")
- **Implementation tasks**: The specific work items
- **Tests**: What tests are needed (unit, integration)
- **Docs**: What documentation needs updating

### 2. Phase Completion Criteria

A phase is only "done" when:
- The outcome is achieved and working
- Tests are written and passing
- Relevant docs are updated

### 3. Architecture Reference

For module structure, server actions vs API routes, and other architectural decisions, see **ARCHITECTURE.md** (Target Architecture section).

Key patterns:
- **Server components** for data fetching (reads)
- **Server actions** for mutations (writes)
- **API routes** only for external integrations (AI, webhooks)

### 4. Design Documents

For significant features, create a design doc in `/docs/` that includes:
- Overview and data model
- User workflow
- Architecture approach (how it fits the module pattern)
- Implementation phases with outcomes
- Open questions

## MCP Servers

### Playwright
Used for UI testing and browser automation.
- Always say "use Playwright MCP" explicitly
- Start dev server first: `npm run dev`
- App runs at: `http://localhost:3000`

### Chrome DevTools
Used for console errors, network debugging, and DOM inspection.
- Use when diagnosing runtime errors after pipeline changes
- Use after any shopping list generation to verify no console errors

## Custom Commands



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
npm test -- lib/dateUtils.test.ts

# Run tests matching a pattern
npm test -- --grep "RecipeCard"
```

## Architecture

Review up to date architecure.md for reference
```

### File Size Guidelines

- **Component files**: Max 150 lines (ideally 100-120)
- **API routes**: Max 50 lines per handler
- **Business logic**: Max 200 lines (with clear sections)
- **Hooks**: 50-80 lines
- **Helpers**: 30-60 lines

## Key Files and Their Purposes

### Core Files

- **`prisma/schema.prisma`**: Database schema defining Recipe, MealPlan, MasterListItem, IngredientMapping models (single source of truth for data validation)
- **`lib/dateUtils.ts`**: Date manipulation helpers (getMonday, formatDate, etc.)
- **`lib/normalise.ts`**: Local ingredient normalisation — form extraction ("garlic cloves" → "garlic (fresh)"), singularisation, quantity stripping
- **`lib/prisma.ts`**: Prisma client singleton
- **`types/index.ts`**: TypeScript type definitions (includes `MatchConfidence`, `ShoppingListItemSource`)

### AI Layer (`lib/ai/`)

- **`client.ts`**: OpenAI client singleton
- **`config.ts`**: AI model config, embedding thresholds (auto: 0.90, suggestion: 0.65, dedup: 0.75)
- **`embeddings.ts`**: `computeEmbeddings()`, `cosineSimilarity()`, `findBestMatches()`, `deduplicateByEmbedding()`
- **`matchIngredients.ts`**: `matchIngredientsAgainstMasterList()` — orchestrates embedding match against master list
- **`normaliseIngredients.ts`**: LLM-based normalisation returning `baseIngredient` and `normalisedName`
- **`prompts.ts`**: AI prompt templates for normalisation and extraction

### Shopping List Module (`app/(modules)/shopping-list/`)

- **`actions.ts`**: Server actions including `syncMealIngredients` (5-step pipeline with two-tier embedding match), `createIngredientMapping`, master list CRUD
- **`suggestionActions.ts`**: `confirmSuggestion`, `reassignSuggestion`, `rejectSuggestion` — resolve pending embedding matches
- **`components/ShoppingListClient.tsx`**: Main client component — tabs, generate button, stale banner, review modal orchestration
- **`components/EmbeddingReviewModal.tsx`**: Full-screen modal for reviewing pending suggestions after list generation
- **`components/SuggestionRow.tsx`**: Individual suggestion with confirm/reassign/reject actions
- **`components/ReassignDropdown.tsx`**: Searchable master item picker for reassigning suggestions
- **`components/ScoreBadge.tsx`**: Colored pill showing embedding similarity score
- **`components/StaleBanner.tsx`**: Warning banner when meal plan changed after list was generated

### Scripts

- **`scripts/backfill-embeddings.ts`**: Backfill embedding vectors for master list items

### API Routes

- **`/api/recipes`**: GET (list/filter), POST (create)
- **`/api/recipes/[id]`**: GET (single), PUT (update), DELETE
- **`/api/recipes/extract`**: POST - AI recipe extraction from text
- **`/api/meal-plan`**: GET (fetch week), POST (save week), PATCH (update meals)
- **`/api/meal-plan/modify`**: POST - Natural language meal plan modifications

### Testing

247+ tests using Vitest covering:
- Shopping list server actions (35 tests) — pipeline, master list CRUD, ingredient mapping
- Suggestion actions (5 tests) — confirm, reassign, reject with idempotency
- Embeddings (18 tests) — cosine similarity, best match, deduplication
- Normalisation (31 tests) — form extraction, singularisation, edge cases
- Shopping list helpers (36 tests) — aggregation, filtering
- Component tests, API route tests, utility tests

## Important Patterns and Conventions

### State Management

- React `useState` for local component state
- No global state management (Redux/Zustand) - keeping it simple
- API calls refresh data from source of truth (database)
- Form state managed locally within form components

### Data Immutability

- Always create new arrays/objects when updating state
- Use spread operators for updates: `setData({ ...data, field: newValue })`
- Array operations: `filter()`, `map()`, avoid direct mutations

### TypeScript Usage

- Strict type checking enabled
- Prisma generates types automatically
- Use `type` for data shapes, `interface` for component props
- Prisma handles runtime validation at the database level

### React Patterns

- Functional components only
- Arrow functions for consistency
- Extract reusable components (Button, Select)
- Keep components < 250 lines
- Use descriptive prop names and comments

### Storage Service Pattern

Not applicable - using Prisma ORM with PostgreSQL database instead of localStorage or other client-side storage.

## Database Schema

The app uses a relational model with named relations for multiple references:

**Recipe**: Can serve as protein, carb, or vegetable in different meal plans
**MealPlan**: References up to 3 recipes (protein, carb, vegetable) per day
**MasterListItem**: Household staples/restock items with `normalisedName` and embedding vectors for ingredient matching
**IngredientMapping**: Learned mappings from recipe ingredient names to master list items (upsert with `confirmedCount`)
**ShoppingListItem**: Items on weekly list with `source` ('recipe'|'staple'|'restock'|'manual'), `displayedName` (user-facing), `masterItemId` FK, `matchConfidence` ('explicit'|'embedding'|'unmatched'|'pending'), and `similarityScore` (float, for review UI)
**RejectedSuggestion**: Records rejected embedding suggestions so they don't resurface (unique on `normalisedName` + `masterItemId`)
**ShoppingList.stale**: Boolean flag set when meal plan changes after list was generated; reset when pipeline runs

Key feature: Optional fields allow flexible meal composition (protein-only, carb-only, or combined meals).

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

### Adding a New Recipe Field

1. Update `prisma/schema.prisma` to add the field
2. Run `npx prisma migrate dev --name add_field_name`
3. Run `npx prisma generate` to update Prisma client types
4. Update `RecipeForm.tsx` to include the new field
5. Update `types/index.ts` if needed for form data types

### Adding a New API Endpoint

1. Create file in `app/api/[route]/route.ts`
2. Export async functions: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
3. Add basic validation for required fields (Prisma handles the rest)
4. Use Prisma client for database operations
5. Return `NextResponse.json()` with appropriate status codes

### Database Migrations

```bash
# Create migration after schema changes
npx prisma migrate dev --name descriptive_migration_name

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Regenerate Prisma client after schema changes
npx prisma generate

# Open Prisma Studio to view/edit data
npx prisma studio
```

## Environment Variables

Required in `.env` file:

```
DATABASE_URL="postgresql://user:password@localhost:5432/mealplanner"
OPENAI_API_KEY="your-api-key-here"
```

See `.env.example` for template.

## Build and Deploy

### Development

```bash
npm run dev  # Starts dev server on http://localhost:3000
```

### Production

```bash
npm run build   # Creates optimized production build
npm start       # Runs production server
```

### Deployment Notes

- Ensure `DATABASE_URL` points to persistent storage
- Set `OPENAI_API_KEY` in environment variables
- Run `npx prisma migrate deploy` in production (not `migrate dev`)
- PostgreSQL database must be accessible from the application

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ features used
- No IE11 support
- Requires JavaScript enabled

## Gotchas and Edge Cases

### Prisma Named Relations

The schema uses named relations (`@relation("ProteinRecipe")`) because Recipe has multiple references in MealPlan. When querying:

```typescript
// ✅ Correct
include: { proteinRecipe: true, carbRecipe: true }

// ❌ Wrong
include: { recipe: true }  // This relation doesn't exist
```

### Optional Recipe Fields

`proteinType` and `carbType` are optional in the schema. A recipe can be:
- Protein-only (e.g., grilled chicken)
- Carb-only (e.g., rice pilaf)
- Both (e.g., chicken fried rice)
- Neither (e.g., salad - would use vegetableType)

### Date Handling

- Always use `getMonday()` from `lib/dateUtils.ts` for week calculations
- The app assumes weeks start on Monday
- Dates in the database are stored in UTC
- Use `setHours(0, 0, 0, 0)` to normalize dates when comparing

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
