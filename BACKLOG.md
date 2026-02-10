# Product Backlog

Living document for tracking features, bugs, and improvements.


---

### Priority 1.8: P1 Bugs (2026-02-09)

- [x] **Shopping list: master list / weekly instantiation logic broken** — Fixed: shopping list is now a live view. Auto-created with staples on page visit, meal ingredients sync on meal plan save, Generate button removed. (2026-02-09)
- [x] **Shopping list: checkbox toggle causes full-list re-render** — Fixed: added React 19 `useOptimistic` hook for instant client-side updates. Server action still syncs in the background; no more visible flash. (2026-02-09)

---

### Priority 2: AI Utilisation

Read Shopping-List-Normalisation.md in Docs

- [x] **Ingredient normalisation MVP** — Added `baseIngredient` field to MasterListItem, AI normalisation module (`lib/ai/normaliseIngredients.ts`), backfill script with --dry-run support. All 52 master list items backfilled. (2026-02-10)
- [ ] **Normalisation matching** — Use `baseIngredient` to filter staples/restock from shopping list generation (next step)
- [ ] **Add/edit hooks** — Wire normalisation into add/edit MasterListItem flow (after matching is proven)
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
- [ ] Reorder items within categories (drag-and-drop)
- [ ] Fuzzy matching for semantic duplicates (mayo/mayonnaise, salt/salt and pepper)

### AI Quality
- [ ] Improve ingredient extraction quality (incomplete items like "boneless", "Dressing")

---

## Completed

- [x] Dynamic dish types management (protein/carb types stored in database, manageable via Settings) (2026-02-06)
- [x] Category management in Settings (add/edit/delete categories for staples/restock) (2026-02-06)
- [x] Settings page with master list management UI (2026-02-06)
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
