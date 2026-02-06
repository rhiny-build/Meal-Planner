# Product Backlog

Living document for tracking features, bugs, and improvements.

## This Week (2026-02-02)

### Priority 0: Housekeeping (Code Review Cleanup)

**Quick Wins:** ✅ All complete
- [x] Hide debug UI in production (removed entirely) - [Code Review #1]
- [x] Fix CLAUDE.md database documentation (SQLite → PostgreSQL) - [Code Review #4]
- [x] Extract duplicate `formatIngredient` function to shared utility - [Code Review #5]
- [x] Fix localStorage hydration issue in meal-plan/page.tsx - [Code Review #6]
- [x] Remove orphaned `validations.ts` comment in schema - [Code Review #12]

**Refactoring:** ✅ All complete
- [x] Create toast notification system and replace all `alert()` calls - [Code Review #3, #7]
- [x] Move `confirm()` from useRecipes hook to component level - [Code Review #11]

**Deferred (if time permits):** ✅ Complete
- [x] File size refactoring (RecipeForm, MealPlanGrid, useMealPlan) - [Code Review #2]
- [x] Add useCallback optimizations in useRecipes - [Code Review #8]
- [~] Add response validation with Zod - [Code Review #10] - Rejected (previously removed Zod for simplicity)

---

### Priority 1: Non-AI Functionality

**Meal Plan UI:**
- [x] Add collapsible drawer for ingredient details (click day name to expand)

**Shopping List:** Assembly flow complete, master list management pending
- [x] Add delete button for shopping list items - [Code Review #9] - ignored as per user instruction
- [x] Add tabs UI (This Week | Staples | Restock)
- [x] Schema: Category and MasterListItem tables
- [x] Seed data: 11 categories, 52 master list items (34 staples, 18 restock)
- [x] Staples: Auto-included when generating list, uncheck to exclude
- [x] Restock: Check to include in this week's list
- [x] Generate list now includes meal ingredients + all staples

**UI Fixes:** ✅ All complete
- [x] Checkbox default bug in Staples tab: all staples should be checked by default (currently unchecked)
- [x] Shopping list tab separation: Split into 4 tabs (This Week's Meals | Staples | Restock | Shopping List)
- [x] Group Staples and Restock items by category with collapsible accordion (collapsed by default)

**Remaining Shopping List Work:**
- [ ] Master list management UI (add/edit/delete staples and restock items permanently) - Phase 2 from design doc
- [ ] Polish: Remove mockup pages (`/mockups/tabs`, `/mockups/accordion`, `/mockups/modal`)
- [ ] Later: Remove auto-seed from build script once data is stable

---

### Priority 1.5: Testing Infrastructure ✅ COMPLETE

- [x] Testing infrastructure with Vitest (150 tests: 132 unit + 18 integration)
- [x] Separate test database for integration tests
- [x] Coverage: Shopping list, recipes, meal plan, hooks, components, AI functions

---

### Priority 2: AI Utilisation

- [ ] URL extraction returning wrong recipe (investigate HTML parsing/prompt) - e.g., honey garlic chicken URL returned "Classic Tomato Basil Pasta"
- [ ] Meal plan completion overwrites user selections (prompt not constraining properly)
- [ ] Experiment with OpenAI for better aggregation of shopping list ingredients

---

## Next Tier

### UX Improvements
- [ ] Convert select elements to react-select and complete styling
- [ ] Modernise UX: experiment with different themes (let user choose)
- [ ] Add This Week / Next Week tabs to meal plan header
- [ ] Consider drag and drop functionality for meals

### Bugs
- [ ] Inspire Me reject marks two recipes instead of one (investigate)

### Observability
- [ ] Add logging for AI prompts/responses (viewable in Vercel function logs)

---

## Later / UX Pass

### Visual & Interaction
- [ ] Visual refresh - modernize look and feel
- [ ] Drag-and-drop meals between days
- [ ] Mobile responsiveness: editing on phone (viewing complete)

### Shopping List Enhancements
- [ ] Manage master lists (add/edit/delete staples and restock items permanently)
- [ ] Reorder items within categories (drag-and-drop)
- [ ] Fuzzy matching for semantic duplicates (mayo/mayonnaise, salt/salt and pepper)

### AI Quality
- [ ] Improve ingredient extraction quality (incomplete items like "boneless", "Dressing")

---

## Completed

- [x] Mobile meal plan view with swipe navigation and day persistence (2026-02-06)
- [x] Shopping list tab separation - 4 tabs: Meals | Staples | Restock | Shopping List (2026-02-05)
- [x] Testing infrastructure with Vitest - 150 tests (2026-02-05)
- [x] Shopping list staples/restock feature (2026-02-04)
- [x] Add day notes field (localStorage, auto-clears after week passes)
- [x] Add vegetable dish support (checkbox in recipes, third column in meal plan grid)
- [x] Remember last viewed week (localStorage persistence)
- [x] Refresh recipes list on navigation (visibilitychange listener)
- [x] Fix unit stripping bugs (parenthetical quantities, unit-only prefixes)
- [x] Add Radix Tooltip for truncated recipe names in meal plan grid
- [x] Add lunch support (schema, recipes, meal plan grid, shopping list)

---

## Notes

- **2026-02-04**: Critical issue - seed script data loss. See [Critical-Issues-Log.md](docs/Critical-Issues-Log.md)
- Perplexity integration for "Inspire Me" search working well
- Shopping list schema discussion resolved: keeping simple text-based approach (no foreign keys to ingredients)
- Code review completed 2026-01-31 - see [Code-Review-2026-01-31.md](Code-Review-2026-01-31.md) for full details
- Shopping list feature design doc: [Shopping-List-Feature-Design.md](docs/Shopping-List-Feature-Design.md) - Phase 1 & 2 complete
