# Code Review Report - 2026-02-11

## Summary

The codebase has matured significantly since the January 31st review. Many items from that review have been addressed: `alert()` calls replaced with `sonner` toasts, `formatIngredient` extracted to a shared helper, localStorage hydration fixed, `useCallback` added, debug UI removed, and documentation updated. The AI module has grown with normalisation, matching, and improved meal plan generation.

This review focuses on the current state — file size violations, code duplication, AI module architecture, and AI-assisted coding suitability.

---

## Areas for Improvement

### 1. Oversized Components — Settings Module

**Files**:
- `app/(modules)/settings/components/MasterListsTab.tsx` — 351 lines (guideline: 150)
- `app/(modules)/settings/components/DishTypesTab.tsx` — 251 lines (guideline: 150)
- `app/(modules)/settings/components/CategoriesTab.tsx` — 232 lines (guideline: 150)

**Issue**: These three components share a nearly identical pattern (editable list items with add/edit/delete) but each implements it independently. `DishTypesTab` and `CategoriesTab` are especially similar — both render lists with inline editing, save/cancel buttons, and delete confirmation.

**Recommendation**: Extract a shared `<EditableListItem>` component and CRUD hooks. `MasterListsTab` additionally needs its accordion logic and add-item form extracted.

**Ease of Fix**: Medium — mostly mechanical extraction, low coupling to other modules
**Impact**: High — reduces ~830 lines across 3 files to ~420, eliminates the largest duplication in the codebase

---

### 2. Oversized Components — Shopping List

**Files**:
- `app/(modules)/shopping-list/components/ShoppingListClient.tsx` — 331 lines (guideline: 150)
- `app/(modules)/shopping-list/actions.ts` — 368 lines (guideline: 200)

**Issue**: `ShoppingListClient` manages 4 tab views (Meals, Staples, Restock, List) all inline. `actions.ts` mixes shopping list lifecycle, master list CRUD, and ingredient syncing — `syncMealIngredients` alone is ~100 lines.

**Recommendation**:
- Split `ShoppingListClient` into 4 tab content components (~80 lines each) + a thin tab router
- Extract `syncMealIngredients` core logic into a pure function in `lib/shoppingListHelpers.ts`, keeping the server action as a thin orchestrator
- Extract revalidation calls into a shared helper

**Ease of Fix**: Medium-Large — tab components are straightforward; action refactoring needs care around server action boundaries
**Impact**: High — improves maintainability of the most active feature area

---

### 3. Oversized Components — Meal Plan & Recipes

**Files**:
- `components/RecipeForm.tsx` — 261 lines (guideline: 150)
- `app/meal-plan/components/MealPlanMobile.tsx` — 230 lines (guideline: 150)
- `app/meal-plan/components/DraggableRecipeCell.tsx` — 212 lines (guideline: 150)
- `app/recipes/components/InspireModal.tsx` — 182 lines (guideline: 150)
- `app/meal-plan/components/MealPlanGrid.tsx` — 178 lines (guideline: 150)

**Issue**: `RecipeForm` mixes AI import logic with form rendering. `MealPlanMobile` has swipe logic, colour config, and card rendering all inline. Others are moderately over the limit.

**Recommendation**:
- Extract AI import section from RecipeForm (the `AIImportSection` component already exists at `components/AIImportSection.tsx` — verify it's being used)
- Extract swipe navigation hook and colour config from `MealPlanMobile`
- The others are close to the limit and lower priority

**Ease of Fix**: Small-Medium
**Impact**: Medium — improves readability, particularly for RecipeForm which is frequently modified

---

### 4. Oversized Hooks

**Files**:
- `lib/hooks/useMealPlan.ts` — 189 lines (guideline: 80)
- `lib/hooks/useRecipes.ts` — 145 lines (guideline: 80)

**Issue**: `useMealPlan` handles data fetching, state management, recipe filtering, AI plan application, visibility refresh, and recipe swapping — too many concerns for one hook. It also contains commented-out alert() calls (lines 155, 168) that should be removed. `useRecipes` has repetitive CRUD handler patterns.

**Recommendation**:
- Extract `useMealPlanData(startDate)` — just fetch + state
- Extract `useAutoRefresh(callback)` — visibility change listener (reusable)
- Extract `swapRecipesInPlan()` and `applyGeneratedPlanToCurrent()` to `lib/mealPlanHelpers.ts` as pure functions
- Remove commented-out code on lines 155 and 168

**Ease of Fix**: Medium
**Impact**: Medium — makes the meal plan's core hook testable and maintainable

---

### 5. API Route Size Violations

**Files exceeding 50-line guideline**:
- `app/api/recipes/[id]/route.ts` — 144 lines (3 handlers: GET, PATCH, DELETE)
- `app/api/recipes/discover/route.ts` — 126 lines
- `app/api/meal-plan/create/route.ts` — 93 lines
- `app/api/recipes/create/route.ts` — 85 lines
- `app/api/meal-plan/modify/route.ts` — 79 lines

**Issue**: Repeated error handling pattern across all routes (`try/catch → console.error → NextResponse.json({ error }, { status: 500 })`). Business logic is inline rather than delegated to service functions.

**Recommendation**: Extract a shared error handler utility and move business logic to service functions. The routes should be thin wrappers: parse request → call service → return response.

**Ease of Fix**: Medium — needs a consistent pattern established first, then mechanical refactoring
**Impact**: Medium — reduces boilerplate, makes API layer more consistent

---

### 6. AI Module — No Retry Logic or Rate Limit Handling

**Files**: All files in `lib/ai/`

**Issue**: Every AI function wraps its OpenAI call in a simple try-catch with no distinction between error types. If the API returns a 429 (rate limit), network timeout, or transient error, the request fails immediately. No exponential backoff, no circuit breaker.

**Recommendation**: Create a shared `callWithRetry()` wrapper in `lib/ai/client.ts` that handles:
- Rate limiting (429) — retry with exponential backoff
- Network timeouts — retry once
- Invalid API key / bad request — fail immediately

**Ease of Fix**: Small — single utility function, then wrap existing calls
**Impact**: High — prevents user-facing failures during API load spikes

---

### 7. AI Module — No Runtime Validation of AI Responses

**Files**: `lib/ai/modifyMealPlan.ts`, `matchIngredients.ts`, `normaliseIngredients.ts`, `extractIngredientsFromURL.ts`

**Issue**: All functions parse JSON from AI responses and cast with `as` without validating the structure. If the AI returns unexpected JSON (missing fields, wrong types, extra fields), errors surface later in the call chain rather than at the boundary.

**Recommendation**: Add lightweight validation at the parse boundary. Options:
- Simple: manual field checks with early returns (no new dependencies)
- Better: Use Zod schemas (already a common pattern in Next.js projects)

**Ease of Fix**: Small-Medium
**Impact**: Medium — prevents cryptic downstream errors, makes debugging AI issues easier

---

### 8. AI Module — Hardcoded Configuration

**Files**: All files in `lib/ai/`

**Issue**: Temperature, max tokens, and timeouts are either hardcoded or inconsistent:
- Only `modifyMealPlan.ts` sets temperature (0.2) — all others use the SDK default (1.0)
- Only `modifyMealPlan.ts` sets max_completion_tokens (4000) — others are unbounded
- `extractIngredientsFromURL.ts` truncates HTML to 15,000 chars with no configurable limit
- No timeout configuration

**Recommendation**: Create a `lib/ai/config.ts` with a unified configuration object mapping each function to its temperature, max tokens, and timeout. This makes it easy to tune behaviour without touching business logic.

**Ease of Fix**: Small
**Impact**: Medium — prevents unexpected cost spikes, makes AI behaviour tuneable

---

### 9. AI Module — Prompts Hardcoded Inline

**Files**: All files in `lib/ai/`

**Issue**: System and user prompts are hardcoded as template literals inside function bodies. `modifyMealPlan.ts` has a ~60-line prompt inline. This makes it hard to:
- Iterate on prompts without touching business logic
- Version-control prompt changes separately
- Test different prompt variations

**Recommendation**: Extract prompts to a `lib/ai/prompts.ts` module. Each prompt becomes an exported function that takes data and returns the formatted string. Business logic files import and call the prompt builders.

**Ease of Fix**: Small — mechanical extraction
**Impact**: Medium — significantly improves prompt iteration speed

---

### 10. Code Duplication — Column-to-RecipeKey Mapping

**Files**: `lib/hooks/useMealPlan.ts` (lines ~61-73 and ~124-131)

**Issue**: The same ternary chain mapping column names (`'lunch'`, `'protein'`, `'carb'`, `'vegetable'`) to recipe ID keys (`'lunchRecipeId'`, `'proteinRecipeId'`, etc.) appears twice. This pattern also appears in API routes and helpers.

**Recommendation**: Extract to a utility function `getRecipeKeyFromColumn(column)` in `lib/mealPlanHelpers.ts`.

**Ease of Fix**: Easy
**Impact**: Low — small DRY improvement but prevents bugs when adding new column types

---

### 11. Stale `dev.db` File in Repository

**File**: `dev.db` (24KB SQLite file at project root)

**Issue**: The project migrated from SQLite to PostgreSQL but the old `dev.db` file remains in the repository and is not in `.gitignore`. This is confusing since the project now uses PostgreSQL exclusively.

**Recommendation**: Remove `dev.db` from the repository and add it to `.gitignore`.

**Ease of Fix**: Easy
**Impact**: Low — removes confusion for contributors

---

### 12. `apiService.ts` TODO — Split Into Modules

**File**: `lib/apiService.ts:6`

**Issue**: There's a TODO comment: `"Split this file into separate modules (mealPlanApi.ts, recipeApi.ts, shoppingListApi.ts)"`. This was noted in the last review cycle and hasn't been addressed. The file currently mixes concerns across all three domains.

**Recommendation**: Split as the TODO suggests. Each module handles one domain's API calls.

**Ease of Fix**: Small-Medium — mechanical but needs import updates across consumers
**Impact**: Low-Medium — improves discoverability and reduces cognitive load

---

### 13. Missing Test Coverage for AI Functions

**Files**: `lib/ai/` — only `extractIngredientsFromURL` has tests (`ai.test.ts`)

**Issue**: 3 of 4 AI functions have zero test coverage:
- `normaliseIngredients.ts` — no tests
- `matchIngredients.ts` — no tests
- `modifyMealPlan.ts` — no tests (most complex function)

**Recommendation**: Add unit tests with mocked OpenAI responses. Priority: `modifyMealPlan.ts` (highest complexity).

**Ease of Fix**: Medium — test patterns exist in `ai.test.ts` to follow
**Impact**: High — AI functions are the riskiest code paths and currently untested

---

## AI-Assisted Coding Suitability

This section evaluates how well the codebase supports AI-assisted development (Claude Code, Copilot, etc.) — specifically, how much context an AI needs to load to make safe changes.

### Current Strengths

- **Good barrel exports**: `lib/ai/index.ts` provides clean entry points
- **Clear module boundaries**: AI code lives in `lib/ai/`, hooks in `lib/hooks/`, components in module folders
- **Type definitions centralised**: `types/index.ts` gives AI tools a single reference point
- **CLAUDE.md is comprehensive**: Provides excellent onboarding context for AI assistants

### Areas Where Modularity Would Help AI-Assisted Changes

| Area | Current Context Required | Recommendation | Benefit |
|------|--------------------------|----------------|---------|
| **Settings tabs** | AI must read all 3 tab files (830+ lines) to understand the shared pattern before modifying any one | Extract shared `<EditableListItem>` component | AI only needs to read the shared component + the specific tab |
| **Shopping list actions** | AI must read the full 368-line `actions.ts` to find the right function to modify | Split into `shoppingListActions.ts` + `masterListActions.ts` | Narrower files = less context needed |
| **AI prompts** | To modify a prompt, AI must read the full function file, understand the data flow, and find the prompt inline | Extract to `lib/ai/prompts.ts` | AI can modify prompts in isolation without risking business logic |
| **useMealPlan hook** | AI must read 189 lines covering 6+ concerns to modify any one behaviour | Split into focused hooks | AI loads only the relevant sub-hook |
| **API error handling** | AI must understand the full route to add/modify error handling | Extract shared error handler | AI applies consistent pattern without reading each route |
| **Column mapping** | Duplicated ternary chains mean AI might fix one and miss the other | Single utility function | AI updates one location, all callers benefit |

### Specific Risk: AI Modifying Prompts

The biggest AI-assisted coding risk is prompt modification. Currently, prompts live inside business logic functions. An AI assistant modifying a prompt could accidentally:
- Break the JSON parsing logic that depends on the prompt's output format
- Change instruction wording that the downstream code relies on
- Introduce inconsistencies between the prompt and the response validation

**Recommendation**: Separating prompts from business logic (Issue #9) is the single highest-impact change for AI-assisted coding safety. It creates a clear contract: prompts produce a specific JSON shape, business logic consumes it.

---

## Review of Previous Code Review (2026-01-31)

### Items Fixed Since Last Review

| # | Issue | Status |
|---|-------|--------|
| 1 | Debug UI exposed in production | Fixed — removed entirely |
| 3 | Inconsistent `alert()` error handling | Fixed — migrated to `sonner` toasts |
| 4 | CLAUDE.md references SQLite | Fixed — updated to PostgreSQL |
| 5 | Duplicate `formatIngredient` | Fixed — extracted to `lib/ingredientHelpers.ts` |
| 6 | localStorage hydration risk | Fixed — moved to `useEffect` |
| 7 | apiService contains UI logic (`alert()`) | Fixed — alerts removed |
| 8 | Missing `useCallback` optimisations | Fixed — added to `useRecipes.ts` |
| 11 | `confirm()` in hook | Fixed — removed from `useRecipes.ts` |
| 12 | Schema comment references missing file | Fixed — comment removed |

### Items Still Outstanding

| # | Issue | Current Status | Notes |
|---|-------|----------------|-------|
| 2 | File size guideline violations | **Still present, worse** | `RecipeForm` down from 299→261 but still over. `useMealPlan` down from 232→189 but still over. New oversized files added (MasterListsTab, ShoppingListClient, etc.) |
| 9 | Missing shopping list item delete | **Needs verification** | The shopping list architecture changed significantly (now a live view) — this may no longer apply in the same way |
| 10 | Missing response validation in API calls | **Still present** | `apiService.ts` still casts responses directly to types without validation |

### Key Observation

The file size issue from the previous review has expanded rather than contracted. While `MealPlanGrid` came down from 243 to 178 lines, the settings and shopping list modules introduced during February have significant size violations. The project's own guideline of 150 lines for components is being consistently exceeded — worth either enforcing more strictly or revising the guideline to be realistic for this codebase.

---

## Quick Wins (< 30 minutes each)

1. Remove commented-out alerts from `useMealPlan.ts` lines 155, 168 (Issue #4)
2. Extract column-to-key mapping utility (Issue #10)
3. Remove `dev.db` and add to `.gitignore` (Issue #11)
4. Create `lib/ai/config.ts` with unified AI configuration (Issue #8)

## Recommended Priority Order

| Priority | Issue # | Description | Effort |
|----------|---------|-------------|--------|
| High | 13 | Test coverage for AI functions | Medium |
| High | 6 | AI retry logic / rate limit handling | Small |
| High | 1 | Settings module component extraction | Medium |
| High | 2 | Shopping list component/action splitting | Medium-Large |
| Medium | 9 | Extract AI prompts to separate module | Small |
| Medium | 7 | Runtime validation of AI responses | Small-Medium |
| Medium | 4 | useMealPlan hook refactoring | Medium |
| Medium | 5 | API route error handling extraction | Medium |
| Low | 3, 8, 10-12 | Remaining cleanup items | Small each |

---

## Positive Observations

- **Significant progress since last review**: 9 of 12 previous items addressed
- **Good AI module structure**: Clean separation in `lib/ai/` with barrel exports
- **Toast migration complete**: Consistent use of `sonner` for user notifications
- **Active backlog management**: BACKLOG.md is well-maintained with clear priorities
- **Normalisation feature well-implemented**: New `baseIngredient` normalisation is clean and follows existing patterns
- **Test count growing**: Test infrastructure solid with Vitest, integration tests present
- **Server actions adopted well**: Settings and shopping list modules use Next.js server actions appropriately

---

*Generated by Claude Code Review - 2026-02-11*
