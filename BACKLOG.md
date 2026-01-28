# Product Backlog

Living document for tracking features, bugs, and improvements.

## This Week

### Meal Plan Improvements
(no items)

### Shopping List
(no items)

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

- [x] Add day notes field (localStorage, auto-clears after week passes)
- [x] Add vegetable dish support (checkbox in recipes, third column in meal plan grid)
- [x] Remember last viewed week (localStorage persistence)
- [x] Refresh recipes list on navigation (visibilitychange listener)
- [x] Fix unit stripping bugs (parenthetical quantities, unit-only prefixes)

---

## Notes

- Perplexity integration for "Inspire Me" search working well
- Shopping list schema discussion resolved: keeping simple text-based approach (no foreign keys to ingredients)
