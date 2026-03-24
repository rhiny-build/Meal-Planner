# Product Backlog

Living document for tracking features, bugs, and improvements.


---

### Priority 1.8: P1 Bugs (2026-02-09)

- 
- [ ] URL extraction returning wrong recipe (investigate HTML parsing/prompt) - e.g., honey garlic chicken URL returned "Classic Tomato Basil Pasta"
- [x] **Meal plan completion overwrites user selections** — Fixed: grouped available recipes by slot type in the prompt so the AI can only pick valid recipes per column (lunch/protein/carb/vegetable). (2026-02-11)

---

## Next Tier

### UX Improvements
- 

### Bugs
- [ ] Inspire Me reject marks two recipes instead of one (investigate)
- [ ] **Shopping list shows raw recipe text instead of clean ingredient name** — e.g. "½ small red onion very thinly sliced, about ⅛-inch wide" instead of "red onion". The pipeline writes `item.name` (the original aggregated recipe ingredient string) to `ShoppingListItem.name`. Should use the normalised base ingredient name for display.

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
- [ ] **Move pending suggestions out of ShoppingListItem** — `matchConfidence`, `masterItemId`, and `similarityScore` on `ShoppingListItem` are almost always null/unmatched. The only useful state is `pending` (for the review modal). Consider a dedicated `PendingSuggestion` table or transient in-memory state, and remove these columns from `ShoppingListItem`.
- [x] **lib/ and scripts/ restructuring** — Shopping list files reorganised into `lib/shopping-list/` and `scripts/shopping-list/` with descriptive names. `lib/normalisation/` merged and removed. (2026-03-20)

---

