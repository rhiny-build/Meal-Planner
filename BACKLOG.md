# Product Backlog

Living document for tracking features, bugs, and improvements.


---

### Priority 1.8: P1 Bugs (2026-02-09)

- [x] **URL extraction returning wrong recipe** — Superseded: the old `/api/recipes/extract` route, `extractIngredientsFromURL` and `AIImportSection` were removed. The Import agent (S05) reads the page's own recipe data (JSON-LD) or its visible text and validates the draft; the user reviews it before saving. (2026-10-12)
- [ ] **`/api/mcp` has no authentication (P1, security)** — anyone with the production URL can read recipes, meal plans and shopping history, create recipes, and (since `update_recipe`) overwrite or wipe the method and ingredients of any recipe. Decide on a minimum: a long random token in the path or a header check from an env var (e.g. `MCP_SECRET`), or OAuth (claude.ai custom connectors support both). Decision for Ronen.
- [x] **Meal plan completion overwrites user selections** — Fixed: grouped available recipes by slot type in the prompt so the AI can only pick valid recipes per column (lunch/protein/carb/vegetable). (2026-02-11)

---

## Next Tier

### UX Improvements
- 

### Bugs
- [ ] Inspire Me reject marks two recipes instead of one (investigate)
- [ ] **Shopping list shows raw recipe text instead of clean ingredient name** — e.g. "½ small red onion very thinly sliced, about ⅛-inch wide" instead of "red onion". The pipeline writes `item.name` (the original aggregated recipe ingredient string) to `ShoppingListItem.name`. Should use the normalised base ingredient name for display.

### Recipe book and import
- [ ] **Import prompt can invent a method.** The enrich prompt (S07) says a one-line remark such as "Combine and enjoy" is not a method. The normal Import screen prompt (`buildSystemPrompt` in `lib/agents/recipeImporter/prompt.ts`) lacks that sentence, so a page with no real method may come back with a one-line invented step (breaks D3). Add the sentence and test with a no-method page.
- [ ] **Missing ingredient quantities are not filled.** The backfill never fills quantities missing from existing ingredient lines (the page's amounts may be for different servings). Optional follow-up if wanted.
- [ ] **DNS rebinding gap in `safeFetch`.** The address is checked before the request, so a hostile DNS server could answer differently the second time. Closing it means pinning the connection to the checked address. Low risk for a single-household app.
- [ ] **Deleting a recipe deletes the meal-plan days that use it** (`onDelete: Cascade` on all four MealPlan recipe relations). Warn or re-point before deleting (recipe delete button, future cleanup). Changing the relation is a schema change.
- [ ] **Ingredient reorder in the recipe editor.** Rows keep their order; steps can be moved up/down but ingredients cannot.
- [ ] **Modal vs page editing** — editing is still a modal (also reachable from the recipe page). Decide whether it moves onto the recipe page; `RecipeEditor` works either way.
- [ ] **Servings scaling on the recipe page** (optional; cook mode S08 needs it anyway). `renderStepText` already takes a scale.
- [ ] Optional: server-side duplicate-name warning for MCP `create_recipe` (today only the tool description tells Claude to check `get_recipes` first).
- [ ] Optional: per-host rate limiter for batch imports if many recipes share one site.
- [ ] Stale `running` agent runs: mark runs as failed after a timeout (a run killed mid-way stays `running` with 0 tokens).
- [ ] Prompt caching (`cache_control`) for long agent runs, if cost matters.

### Observability
- [ ] Add logging for AI prompts/responses (viewable in Vercel function logs)
- 

## Later / UX Pass


### Shopping List Enhancements
- [ ] Lazy normalisedName computation — In Step 4 of the sync pipeline, if a MasterListItem has no normalisedName, compute it on the fly and save it. Makes the system self-healing.
- [ ] Remove backfill script from deploy — Once lazy computation is in place, remove `scripts/backfill-canonical-names.ts` from the build pipeline and delete the script.
- [ ] Reorder items within categories (drag-and-drop)


### AI Quality
- [ ] Improve ingredient extraction quality (incomplete items like "boneless", "Dressing")

### Tech Debt
- [ ] **Remove `lib/hooks/migrateLocalStorageNotes.ts`** (plus its call in `useDayNotes.ts` and its test) about 2-3 weeks after the S02 deploy (around early November 2026), once both devices have loaded the app. It is the one-off move of day notes from localStorage to the DB.
- [ ] **Drop the legacy `Recipe.ingredients` text column** in a clean-up PR once nothing reads it (write paths still keep it in step).
- [ ] **Delete the one-off backfill** (`scripts/rehaul/`, `lib/agents/recipeBackfill/`) and any generated `backfill-report*` files once it has been applied in production.
- [ ] **Move pending suggestions out of ShoppingListItem** — `matchConfidence`, `masterItemId`, and `similarityScore` on `ShoppingListItem` are almost always null/unmatched. The only useful state is `pending` (for the review modal). Consider a dedicated `PendingSuggestion` table or transient in-memory state, and remove these columns from `ShoppingListItem`.
- [x] **lib/ and scripts/ restructuring** — Shopping list files reorganised into `lib/shopping-list/` and `scripts/shopping-list/` with descriptive names. `lib/normalisation/` merged and removed. (2026-03-20)
- [x] **Timezone bug in date string parsing** — `new Date('YYYY-MM-DD')` parsed as UTC midnight caused off-by-one calendar day in non-UTC timezones (broken in production on Vercel). Added `parseDateParam`/`formatDateParam` helpers to `lib/dateUtils.ts`. Applied to shopping list navigation, meal plan week parsing, and API payloads. (2026-05-07)

---

