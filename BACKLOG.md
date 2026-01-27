# Product Backlog

Living document for tracking features, bugs, and improvements.

## This Week

### Meal Plan Improvements
- [ ] Add vegetable dish dropdown to UI (schema already supports it)
- [ ] Add day notes field (for context like "kid has soccer until 7pm")

### Shopping List
- [ ] Fix unit stripping bugs (parenthetical quantities like "(5-6 oz)", unit-only prefixes like "lb.", "Tbsp.")

### AI Fixes
- [ ] URL extraction returning wrong recipe (investigate HTML parsing/prompt) - e.g., honey garlic chicken URL returned "Classic Tomato Basil Pasta"
- [ ] Meal plan completion overwrites user selections (prompt not constraining properly)

---

## Next Tier

### UX Quick Wins
- [ ] Add This Week / Next Week tabs to meal plan header

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

- [x] Remember last viewed week (localStorage persistence)
- [x] Refresh recipes list on navigation (visibilitychange listener)

---

## Notes

- Perplexity integration for "Inspire Me" search working well
- Schema already has `vegetableRecipeId` - just needs UI
- Shopping list schema discussion resolved: keeping simple text-based approach (no foreign keys to ingredients)
