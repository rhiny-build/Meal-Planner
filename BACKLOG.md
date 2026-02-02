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

**Deferred (if time permits):**
- [ ] File size refactoring (RecipeForm, MealPlanGrid, useMealPlan) - [Code Review #2]
- [ ] Add useCallback optimizations in useRecipes - [Code Review #8]
- [ ] Add response validation with Zod or type guards - [Code Review #10]

---

### Priority 1: Non-AI Functionality

**Meal Plan UI:**
- [ ] Add side panel for clearer meal visibility (details view)

**Shopping List:**
- [ ] Add delete button for shopping list items - [Code Review #9]
- [ ] Manage staples (persistent items that don't need to be on the list)
- [ ] Generate full shopping list (combining meal ingredients + manual items)

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
- [ ] Mobile responsiveness (viewing + editing on phone)

### Shopping List Enhancements
- [ ] Fuzzy matching for semantic duplicates (mayo/mayonnaise, salt/salt and pepper)

### AI Quality
- [ ] Improve ingredient extraction quality (incomplete items like "boneless", "Dressing")

---

## Completed

- [x] Add day notes field (localStorage, auto-clears after week passes)
- [x] Add vegetable dish support (checkbox in recipes, third column in meal plan grid)
- [x] Remember last viewed week (localStorage persistence)
- [x] Refresh recipes list on navigation (visibilitychange listener)
- [x] Fix unit stripping bugs (parenthetical quantities, unit-only prefixes)
- [x] Add Radix Tooltip for truncated recipe names in meal plan grid
- [x] Add lunch support (schema, recipes, meal plan grid, shopping list)

---

## Notes

- Perplexity integration for "Inspire Me" search working well
- Shopping list schema discussion resolved: keeping simple text-based approach (no foreign keys to ingredients)
- Code review completed 2026-01-31 - see [Code-Review-2026-01-31.md](Code-Review-2026-01-31.md) for full details
