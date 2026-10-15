# Code Review Maintainability Work — Progress

Based on: `docs/Code Reviews/Code-Review-2026-02-11.md`

## Branch: `feature_phase1_maintainability_cleanup`

---

## Phase 1 — Clean the Ground (COMPLETE)

All committed. Build passes, 173/173 tests pass.

### Done:
- [x] `dev.db` — already untracked and in `.gitignore`, nothing needed
- [x] Removed commented-out debug alerts in `useMealPlan.ts` (lines 155, 168)
- [x] Extracted `getRecipeKeyFromColumn()` to `lib/mealPlanHelpers.ts` — replaced duplicated ternary chains
- [x] Created `lib/ai/config.ts` — centralised temperature, max_completion_tokens, HTML max length
- [x] Created `lib/ai/prompts.ts` — extracted all 4 system prompts + 4 user prompt builders
- [x] Updated all 4 AI function files to use config + prompts
- [x] Fixed `handleRecipeChange` to use functional state update (caught by tests)
- [x] Committed doc reorganisation (Archive folder, Code Reviews folder)

### Commits:
1. `83269da` — Extract AI config, prompts, and column mapping utility
2. `510f83b` — Reorganise docs into Archive and Code Reviews folders

---

## Phase 2 — Biggest Duplication Wins (IN PROGRESS)

### 2a. Settings Tabs — Shared Components (COMPLETE)

Extracted shared components, all committed. Build passes, 173/173 tests pass.

**New shared files created:**
- `app/(modules)/settings/components/EditableListItem.tsx` (~110 lines) — view/edit mode row with icons
- `app/(modules)/settings/hooks/useInlineEdit.ts` (~30 lines) — inline edit state management
- `app/(modules)/settings/components/CategoryAccordion.tsx` (~65 lines) — collapsible category section
- `app/(modules)/settings/components/AddMasterListItemForm.tsx` (~95 lines) — add form with own state

**Line count results:**
- `MasterListsTab.tsx`: 351 → 203 (still over 150 guideline, but remaining logic is unique — sub-tab URL mgmt, category filtering, edit/delete handlers)
- `DishTypesTab.tsx`: 251 → 188
- `CategoriesTab.tsx`: 232 → 167

### Commits:
3. `12eba5b` — Extract shared EditableListItem and useInlineEdit for settings tabs
4. `e4dad59` — Extract CategoryAccordion and AddMasterListItemForm from MasterListsTab

### 2b. useMealPlan Hook Refactoring (COMPLETE)

Extracted reusable hook and pure helpers. Build passes, 187/187 tests pass.

**New files created:**
- `lib/hooks/useAutoRefresh.ts` (~27 lines) — reusable visibility-change listener with ref-based callback (no stale closures)
- `lib/mealPlanHelpers.test.ts` — 14 unit tests for new pure helpers

**Added to `lib/mealPlanHelpers.ts`:**
- `DAYS` constant (exported, shared between hook and helpers)
- `swapRecipesInPlan()` — pure function for drag-and-drop recipe swaps
- `applyGeneratedPlanToWeek()` — merges AI-generated plan into current week
- `createEmptyWeekPlan()` — creates blank 7-day plan

**Line count results:**
- `useMealPlan.ts`: 172 → 109 (guideline: 80 — remaining lines are state + fetch + save orchestration, not further splittable without fragmenting)

### Commits:
5. `9cb16d8` — Refactor useMealPlan: extract useAutoRefresh hook and pure helpers

### Issue Found During 2b Testing: Meal Plan Save Blocked by AI Call (~51s) — RESOLVED

Discovered that `handleSave` → `syncMealIngredients()` → `matchIngredientsAgainstMasterList()` used an LLM chat completion matching ~145 recipe ingredients against ~55 master list items. This took **~51 seconds**, blocking the save button.

**Fix:** Replaced LLM matching with OpenAI embeddings (`text-embedding-3-small`).

**Branch:** `feature_embedding_ingredient_matching`

**Changes:**
- Added `embedding Float[]` column to `MasterListItem` schema
- Created `lib/ai/embeddings.ts` — `computeEmbeddings()`, `cosineSimilarity()`, `findBestMatches()`
- Master list item create/update now computes embedding alongside normalisation
- Rewrote `matchIngredientsAgainstMasterList` to batch-embed recipe ingredients + cosine similarity
- Removed unused LLM matching prompt and config
- Backfill script: `npx tsx scripts/backfill-embeddings.ts`
- 11 new unit tests for embedding utilities, 198/198 total tests passing

---

### 2c. API Route Shared Error Handler (NOT STARTED)
- 5 routes over 50-line guideline
- Extract shared error handler utility
- Move business logic to service functions

---

## Phase 3 — Remaining Splits (NOT STARTED)

### 3a. Shopping List (Review #2)
- `ShoppingListClient.tsx` (331) → 4 tab content components + thin tab router
- `actions.ts` (368) → extract `syncMealIngredients` core logic to `lib/shoppingListHelpers.ts`

### 3b. apiService.ts Split (Review #12)
- Split into `mealPlanApi.ts`, `recipeApi.ts`, `shoppingListApi.ts`

### 3c. Remaining Oversized Components (Review #3)
- `RecipeForm.tsx` (261) — extract AI import section
- `MealPlanMobile.tsx` (230) — extract swipe hook + colour config
- `DraggableRecipeCell.tsx` (212), `InspireModal.tsx` (182), `MealPlanGrid.tsx` (178) — lower priority

---

## Items NOT in maintainability scope (for later)
- Review #6: AI retry logic / rate limit handling
- Review #7: Runtime validation of AI responses (Zod)
- Review #13: Test coverage for AI functions
