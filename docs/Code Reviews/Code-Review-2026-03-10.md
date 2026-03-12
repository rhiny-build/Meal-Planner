# Code Review Report — 2026-03-10

## Summary

The codebase has continued maturing since the February 11th review. The AI layer is well-structured with centralised config, extracted prompts, and a clean normalisation pipeline (`deterministic → DB cache → LLM`). Test coverage is strong at 240+ tests. The shopping list 5-step matching pipeline is the most complex subsystem and also the one with the most technical debt.

This review covers: file size compliance, architectural concerns, error handling, test gaps, code duplication, and AI-assisted coding suitability.

---

## Areas for Improvement

### 1. `actions.ts` — Shopping List Server Actions (614 lines)

**Files**: `app/(modules)/shopping-list/actions.ts`

**Issue**: This is now the largest non-test file in the codebase at **614 lines** (guideline: 200 for business logic). `syncMealIngredients()` alone is ~256 lines orchestrating 5 distinct pipeline steps, debug file I/O, and error recovery — all inline.

**Specific problems**:
- **Fire-and-forget error handling**: Lines like `prisma.ingredientMapping.update(...).catch(() => {})` silently swallow failures. If normalisation/embedding fails on a master list item, the user gets no feedback
- **File I/O mixed with business logic**: `writeDebugLog()` called directly within the pipeline creates `/logs` directory as a side effect
- **Date normalisation repeated**: `setHours(0, 0, 0, 0)` pattern appears 4+ times — should be a utility
- **Duplicate normalisation/embedding blocks**: Lines 522–534 and 552–563 (`addMasterListItem` and `updateMasterListItem`) contain identical 12-line normalise+embed sequences

**Recommendation**: Refactor into an orchestrator pattern:
- Extract each pipeline step into its own function (e.g. `collectIngredients()`, `resolveExplicitMappings()`, `matchByEmbedding()`, `deduplicateResults()`)
- Extract `normaliseAndEmbedItem()` to eliminate duplication between add/update
- Move debug logging to a wrapper/decorator
- Replace silent `.catch(() => {})` with logged warnings

**Ease of Fix**: Medium-Large — the function has many moving parts, but each step is fairly self-contained
**Impact**: High — this is the most active feature area and the hardest file for anyone (human or AI) to reason about

---

### 2. `ShoppingListClient.tsx` — 472 Lines

**File**: `app/(modules)/shopping-list/components/ShoppingListClient.tsx`

**Issue**: Over 3x the 150-line component guideline. Manages 4 tab views (Meals, Staples, Restock, List), optimistic update logic, category filtering, and server action orchestration all inline.

**What's good**: The optimistic update pattern is clean and well-documented — this shouldn't be lost in a refactor.

**Recommendation**:
- Extract each tab's content into its own component (~80–100 lines each)
- Keep the optimistic update logic in the parent as the shared orchestrator
- Extract category filtering helpers (duplicate `map→filter` on lines 230–242)

**Ease of Fix**: Medium — tab contents are fairly independent
**Impact**: Medium-High — the shopping list is the most frequently modified UI area

---

### 3. Oversized Components — Persistent Pattern

**Files exceeding the 150-line component guideline**:

| File | Lines | Over by |
|------|-------|---------|
| `ShoppingListClient.tsx` | 472 | +322 |
| `RecipeForm.tsx` | 261 | +111 |
| `MealPlanMobile.tsx` | 230 | +80 |
| `DraggableRecipeCell.tsx` | 212 | +62 |
| `MasterListsTab.tsx` | 202 | +52 |
| `DeleteItemModal.tsx` | 200 | +50 |
| `DishTypesTab.tsx` | 188 | +38 |
| `InspireModal.tsx` | 182 | +32 |
| `MealPlanGrid.tsx` | 178 | +28 |
| `MasterListTab.tsx` | 177 | +27 |
| `CategoriesTab.tsx` | 167 | +17 |
| `MealPlanGridRow.tsx` | 165 | +15 |
| `ShoppingListItems.tsx` | 158 | +8 |
| `RecipesClient.tsx` | 156 | +6 |

**14 components** exceed the guideline — up from 5 in the January review and 8 in the February review.

**Recommendation**: Either:
- (a) Enforce the guideline more strictly on new code, or
- (b) Revise the guideline to 200 lines for "orchestrator" components and keep 150 for leaf components

The files near the boundary (165 lines and under) aren't worth splitting. Focus effort on the top 5.

**Ease of Fix**: Varies — top 5 are Medium, the rest are Low priority
**Impact**: Medium — affects maintainability and AI-assisted coding context windows

---

### 4. API Routes — No Pagination, Repeated Error Handling

**Files**: All routes in `app/api/`

**Issues**:
- **No pagination**: `GET /api/recipes` and `GET /api/meal-plan/modify` load all records with no limit. Works now but won't scale
- **Repeated error pattern**: Every route has identical `try { ... } catch (error) { console.error(...); return NextResponse.json({ error }, { status: 500 }) }` boilerplate
- **`as any` type casting**: `app/api/recipes/route.ts` lines 21–24 bypass TypeScript safety
- **Batch delete-and-recreate**: `app/api/recipes/[id]/route.ts` PATCH handler deletes all ingredients then recreates them instead of diffing — wasteful and loses any future metadata on ingredients
- **5 routes exceed the 50-line guideline** (unchanged from February review)

**Recommendation**:
- Add a shared `withErrorHandler()` wrapper that standardises try/catch + logging
- Add `take`/`skip` parameters to list endpoints
- Replace `as any` casts with proper Prisma `where` type construction

**Ease of Fix**: Small-Medium
**Impact**: Medium — error handling is boilerplate reduction; pagination prevents future scaling issues

---

### 5. `useRecipes` Hook — Still Oversized, Uses `confirm()`

**Files**: `lib/hooks/useRecipes.ts` (145 lines, guideline: 80)

**Issue**: Contains CRUD logic, filtering, and still calls `confirm()` for delete — a browser native dialog that's poor for accessibility and UX consistency.

**Also**: `app/recipes/components/RecipesClient.tsx:79` also uses `confirm()`.

**Recommendation**:
- Replace `confirm()` with a confirmation modal component (consistent with the delete modal pattern already used in shopping list)
- Extract repetitive CRUD handler patterns into a generic hook or helpers

**Ease of Fix**: Small-Medium
**Impact**: Medium — UX consistency, accessibility improvement

---

### 6. Silent Error Handling Across the Codebase

**Locations**:
- `actions.ts` fire-and-forget `.catch(() => {})` (multiple locations)
- `apiService.ts` casts responses directly to types without validation (noted in both previous reviews, still present)
- API routes return generic "Internal server error" without error classification
- `InspireModal.tsx` has no try-catch around `onAccept`

**Recommendation**:
- Replace `.catch(() => {})` with `.catch(err => console.warn('..context..', err))` at minimum
- Add runtime validation on API response boundaries (Zod or manual checks)
- Classify errors (user error vs server error vs transient) to give meaningful feedback

**Ease of Fix**: Small per-instance
**Impact**: High — silent failures are the hardest bugs to diagnose

---

### 7. AI Module — No Retry Logic (Carried Forward)

**Files**: All files in `lib/ai/`

**Issue**: Still no retry/backoff on OpenAI API calls. A single 429 (rate limit) or network timeout fails the entire operation. This was Item #6 in the February review.

**Recommendation**: Create a `callWithRetry()` wrapper in `lib/ai/client.ts`:
- 429 → exponential backoff (3 retries)
- Network timeout → retry once
- 400/401 → fail immediately

**Ease of Fix**: Small — single utility function
**Impact**: High — prevents user-facing failures during API load spikes

---

### 8. SSR / Hydration Issues in Meal Plan

**Files**:
- `app/meal-plan/components/MealPlanMobile.tsx:105` — direct `localStorage` access without window check
- `app/meal-plan/page.tsx:28-31` — localStorage in useEffect but can still cause hydration mismatch

**Issue**: `MealPlanMobile` accesses `localStorage` directly, which will throw in SSR. The page component has a useEffect wrapper but the initial state differs from the server render.

**Recommendation**:
- Guard `localStorage` access behind `typeof window !== 'undefined'`
- Use a `useMounted()` hook pattern to delay client-only rendering

**Ease of Fix**: Small
**Impact**: Medium — prevents SSR crashes and React hydration warnings in production

---

### 9. `apiService.ts` TODO — Still Not Addressed

**File**: `lib/apiService.ts:6`

**Issue**: The TODO `"Split this file into separate modules (mealPlanApi.ts, recipeApi.ts, shoppingListApi.ts)"` has been present since the January review (3 reviews now).

**Recommendation**: Either do the split or remove the TODO if the current structure is intentionally kept.

**Ease of Fix**: Small-Medium — mechanical split with import updates
**Impact**: Low — cleanup item, but leaving TODOs around indefinitely creates noise

---

### 10. `InspireModal.tsx` — Type Bug and Code Smell

**File**: `app/recipes/components/InspireModal.tsx`

**Issues**:
- **Line 25**: Uses `Set<String>` (capital-S `String` object wrapper) instead of `Set<string>` (primitive) — this is a TypeScript anti-pattern that can cause subtle comparison bugs
- **Line 43**: Commented-out code should be removed
- **Inconsistent state patterns**: `acceptedIds` uses number array, `rejectedRecipes` uses Set — pick one pattern

**Ease of Fix**: Easy
**Impact**: Low — but the `String` vs `string` bug could cause matching failures

---

### 11. Test Coverage Gaps

**Current state**: 240 tests, 14 test files — strong foundation.

**Missing coverage**:

| Area | Gap | Priority |
|------|-----|----------|
| API routes — PATCH/DELETE | Only GET and POST tested for recipes; 0 tests for meal-plan routes | High |
| AI functions — `modifyMealPlan`, `matchIngredients`, `normaliseIngredients` | Only `extractIngredientsFromURL` has tests | High |
| Component loading/error states | No tests for skeleton/error UI | Medium |
| `normaliseWithFallback.ts` | The full fallback chain (deterministic → cache → LLM) is untested | Medium |
| Integration tests | Only 2 files; no e2e user workflow tests | Low (given project scope) |

**Recommendation**: Prioritise AI function tests (highest risk, lowest coverage) and the remaining API route handlers.

**Ease of Fix**: Medium — patterns exist in `ai.test.ts` and `recipes.test.ts` to follow
**Impact**: High — AI functions and API mutations are the riskiest untested code paths

---

### 12. `migrateIngredients.ts` TODO — Build Process Bloat

**File**: `prisma/migrateIngredients.ts:7`

**Issue**: Contains `TODO: Remove this from the build process once all environments are synced.` This script runs during every build but may no longer be needed if all environments have been migrated.

**Recommendation**: Verify all environments are synced, then remove from the build pipeline.

**Ease of Fix**: Easy (once verified)
**Impact**: Low — reduces build time slightly, removes dead code

---

### 13. DEBUG Comment in Production UI

**File**: `app/(modules)/shopping-list/components/ShoppingListItems.tsx:25`

**Issue**: Comment reads `DEBUG: extract base ingredient from notes for visibility`. If this drives any visible UI behaviour, it should be behind a dev flag or removed.

**Recommendation**: Verify whether this affects rendered output. If so, gate behind `NODE_ENV`. If it's just a comment, clean it up.

**Ease of Fix**: Easy
**Impact**: Low

---

## AI-Assisted Coding Suitability

### Current Strengths

- **Well-organised `lib/ai/`**: Clean barrel exports, separated concerns (client, config, prompts, embeddings, matching, normalisation)
- **Centralised types**: `types/index.ts` gives AI tools a single reference point
- **Comprehensive CLAUDE.md**: Provides excellent onboarding context for AI assistants
- **Pure utilities**: `normalise.ts`, `dateUtils.ts`, `shoppingListHelpers.ts` are side-effect-free and easy for AI to reason about
- **Good test patterns**: Existing tests serve as examples for AI to follow when generating new tests

### Areas Where Modularity Would Improve AI-Assisted Changes

| Area | Context Required Today | Recommended Change | Benefit |
|------|------------------------|-------------------|---------|
| **Shopping list actions** | AI must load 614 lines to modify any pipeline step | Split `syncMealIngredients` into step functions | AI loads only the relevant step (~50 lines) |
| **ShoppingListClient** | AI must load 472 lines to modify a single tab | Extract tab content components | AI modifies one tab in isolation |
| **API error handling** | AI must understand each route's try/catch pattern | Shared `withErrorHandler()` wrapper | AI focuses on business logic, not boilerplate |
| **Prompts** | Already extracted to `prompts.ts` (good!) | No change needed | — |
| **AI config** | Already centralised in `config.ts` (good!) | No change needed | — |

### Biggest AI-Assisted Coding Risk

**`syncMealIngredients()` in `actions.ts`** is the single hardest function for an AI to modify safely. At 256 lines with 5 pipeline steps, debug I/O, silent error handlers, and multiple Prisma transactions, an AI assistant must hold the entire function in context to make any change. A modification to Step 3 could inadvertently affect Step 4's input. Splitting this into step functions would make it the easiest function to modify safely.

### AI Context Budget Estimate

For common tasks, how much context does an AI need to load?

| Task | Files to Read | Lines | Verdict |
|------|--------------|-------|---------|
| Fix a normalisation bug | `normalise.ts` + test | 340 | Excellent |
| Modify an AI prompt | `prompts.ts` + caller | 230 | Good |
| Change shopping list sync logic | `actions.ts` + helpers + types | 950+ | Too much |
| Add a new API endpoint | Existing route + types | 200 | Good |
| Modify meal plan UI | Hook + component + helpers | 450+ | Borderline |

---

## Review of Previous Code Reviews — Missed Items

### From January 31 Review (2026-01-31)

| # | Issue | Status |
|---|-------|--------|
| 9 | Missing shopping list item delete | **Likely addressed** — `DeleteItemModal.tsx` (200 lines) exists now |
| 10 | Missing response validation in API calls | **Still present** — `apiService.ts` still casts without validation (3rd review flagging this) |

### From February 11 Review (2026-02-11)

| # | Issue | Status |
|---|-------|--------|
| 1 | Settings module oversized components | **Partially addressed** — `EditableListItem.tsx` (111 lines) was extracted, but `MasterListsTab` (202), `DishTypesTab` (188), `CategoriesTab` (167) still over limit |
| 4 | Commented-out alerts in `useMealPlan.ts` | **Needs verification** — hook is now 108 lines (down from 189), may have been cleaned up |
| 6 | AI retry logic | **Not addressed** — still no retry/backoff (now Item #7 above) |
| 7 | AI response validation | **Not addressed** — still casting with `as` (now part of Item #6 above) |
| 8 | Hardcoded AI config | **Addressed** — `lib/ai/config.ts` now exists with centralised thresholds |
| 9 | Prompts hardcoded inline | **Addressed** — `lib/ai/prompts.ts` now exists with builder functions |
| 11 | Stale `dev.db` in repository | **Needs verification** — not checked in this review |
| 12 | `apiService.ts` TODO | **Not addressed** — 3rd review flagging this (now Item #9 above) |
| 13 | Missing AI function tests | **Partially addressed** — embeddings now well-tested; `modifyMealPlan`, `matchIngredients`, `normaliseIngredients` still untested |

### Key Recurring Items (3 reviews and counting)

1. **`apiService.ts` response validation** — flagged in all 3 reviews, never addressed
2. **`apiService.ts` TODO split** — flagged in 2 of 3 reviews, never addressed
3. **AI retry logic** — flagged in 2 of 3 reviews, never addressed
4. **File size violations** — flagged in all 3 reviews, trend is worsening (5 → 8 → 14 oversized components)

---

## Quick Wins (< 30 minutes each)

1. Fix `Set<String>` → `Set<string>` in `InspireModal.tsx` (Item #10)
2. Remove commented-out code in `InspireModal.tsx` (Item #10)
3. Guard `localStorage` in `MealPlanMobile.tsx` (Item #8)
4. Remove DEBUG comment from `ShoppingListItems.tsx` (Item #13)
5. Extract `normaliseAndEmbedItem()` from duplicate blocks in `actions.ts` (Item #1)
6. Replace `.catch(() => {})` with `.catch(warn)` in `actions.ts` (Item #6)
7. Verify and remove `migrateIngredients.ts` from build (Item #12)

## Recommended Priority Order

| Priority | Item # | Description | Effort |
|----------|--------|-------------|--------|
| **High** | 1 | Refactor `actions.ts` pipeline into step functions | Medium-Large |
| **High** | 7 | Add AI retry/backoff wrapper | Small |
| **High** | 11 | Add tests for AI functions + remaining API routes | Medium |
| **High** | 6 | Replace silent error handling with logged warnings | Small |
| **Medium** | 2 | Split `ShoppingListClient.tsx` into tab components | Medium |
| **Medium** | 4 | API route pagination + shared error handler | Small-Medium |
| **Medium** | 5 | Replace `confirm()` with modal component | Small-Medium |
| **Medium** | 8 | Fix SSR/hydration issues | Small |
| **Low** | 3 | Address remaining oversized components | Varies |
| **Low** | 9-10, 12-13 | Cleanup items | Small each |

---

## Positive Observations

- **AI module matured significantly**: Config centralised, prompts extracted, normalisation pipeline with 3-tier fallback is well-designed
- **`useMealPlan` hook slimmed down**: 189 → 108 lines since February — `useAutoRefresh` and helpers extracted successfully
- **`EditableListItem` extracted**: Shared component created as recommended, reducing settings module duplication
- **Strong test infrastructure**: 240+ tests with Vitest, integration tests on real database, eval runner for normaliser
- **Clean normalisation architecture**: `lib/normalisation/` with pure functions, no side effects — excellent for testing and AI-assisted modification
- **Server actions used appropriately**: Settings and shopping list modules follow Next.js patterns correctly
- **Good documentation ecosystem**: ARCHITECTURE.md, CLAUDE.md, backlog, critical issues log, design docs — well above average

---

*Generated by Claude Code Review — 2026-03-10*
