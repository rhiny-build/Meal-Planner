# Run: ingredient matching for Next week

Read `docs/rehaul/sessions/_common.md` first, especially "Replacing existing behaviour", "Previews must be able to show the feature" and "Real Claude spend" (budget: 150k tokens). Work unsupervised and use the `claude.md` message format.

## Why
Next week's meal cards match each recipe ingredient to something Ronen buys. The matcher in `lib/nextWeek/matchIngredient.ts` compares words only, so it gets things wrong both ways:

| Ingredient (real recipe) | Now | Should be |
|---|---|---|
| Sweet Corn | Haribo sweets | sweetcorn, or "not bought" |
| Garlic powder | fresh garlic | garlic powder, or "not bought" |
| Mayo | egg mayo deli filler | mayonnaise, or "not bought" |
| Fries | breaded halloumi fries | oven chips/fries, or "not bought" |
| Ground Turkey | no match | turkey mince |
| Grated Mozzarela (typo) | no match | grated mozzarella |
| El Paso Tortilla Kit | no match | fajita kit |
| Chicken strips | no match | chicken breast (or mini fillets, if bought) |

Ronen's goal: **he should need to correct as little as possible, ever.**

## Branch
**`rehaul_phase_matching`**, created from the latest `main` (it deploys a preview). One PR to `main` at the end; don't merge it. Before every push, check the branch's PR isn't already merged.

## Scope
1. **Match with meaning, once, and save it.**
   - Matching runs per distinct ingredient name, not per page load. An exact match after normalising (as today) needs no model call.
   - Otherwise the cheap model picks one of Ronen's items, or "not bought", or says it's unsure. It's given the full list of his items with aisle and how often he buys each.
   - The answer is saved in a new table (ingredient name → item, or none, with source: exact, model, or Ronen). Database changes only add.
   - Next week reads the saved answers and doesn't call the model while building the list.
2. **When it runs.**
   - On every recipe save, for any new ingredient names. Recipes are saved from the recipe form, the importer, the backfill and the MCP `create_recipe` and `update_recipe` tools; find every path.
   - When Next week is built and finds a name with no saved answer. This also covers the first run over the ~350 existing names in production.
   - When Ronen's items change (new receipts bring new items), names saved as "not bought" or "unsure" are matched again. Ronen's own choices are never overwritten.
3. **Unsure is visible, once.** A name the model was unsure about shows "check" on its Next week line, unticked, until Ronen picks.
4. **One-tap fix (the backstop).** Every meal-ingredient line gets a way to fix its match:
   - "Wrong product?" on a matched line;
   - "Which product is it?" on a "check" line.
   Both open a searchable list of Ronen's items plus "I don't buy this". The pick is saved against the ingredient name, applies to every recipe using it, and is marked as Ronen's choice. Keep the existing product Edit (item and aisle) as it is.
5. **Cupboard rule.** A cupboard ingredient last bought more than **2×** its usual gap ago is unticked with "Not bought for a long time, check", like the restock cap. Between 1.5× and 2× it stays ticked as "likely out".
6. **Fresh label.** Only say "Fresh" for fresh aisles. Other non-cupboard items (sweets, drinks, household) say "For Tue", without "Fresh".

## Old behaviour to keep
- Everything else about Next week: sections, ticks kept until the order date, "see Tue" greying, "for Mon + Thu", Copy for Sainsbury's, product Edit.
- The old shopping list, behind its Settings switch, unchanged.
- If you find anything else this changes, stop and ask (see `_common.md`).

## Quality bar (real cases)
- `tests/fixtures/matching/recipe-ingredient-names.json` holds all 353 distinct ingredient names from Ronen's 79 production recipes (names only).
- Build the case set from it: each name → expected item, or "not bought". Use generic item names only; no product names, prices or dates in the repo. Ronen's items aren't in the repo, so use the item names in `tests/fixtures/receipts/classify-sample.json` plus obvious generic items. Mark any expected answer you're unsure of, and exclude it from the score.
- Must include every row of the table above.
- Score the current matcher against it, then the new one. The new one must get **every row of the table right** and **at least 95% of the rest**. Use at most 2 real full runs of the model over the set (it's cheap, but stay within budget); unit tests use recorded answers.
- Add a script to re-run the score, and document it in the log.

## Side by side before it ships
- In the log, a table for one real-looking week (use recipes that include all the table rows): ingredient, old match, new match.
- Production can't be compared from here, so under "Try on the preview" and the merge steps, tell Ronen what to look at on next week's real list.

## Testing
- Unit tests: exact match skips the model; saved answers are reused; Ronen's choices are never overwritten; re-matching runs when items change; the cupboard 2× cap; the Fresh label.
- Playwright at phone width: fix a wrong match with "Wrong product?", then a "check" line with "Which product is it?". Both stick after a reload.
- Production mode, per `_common.md`. Check how long the first match over ~350 names takes, and that it fits Vercel's function time limit (from the docs). If it doesn't, batch it.

## Finish
- Log: `docs/rehaul/logs/RUN-ingredient-matching.md`, with every section from `_common.md`, the before/after scores, and the side-by-side table.
- PR to `main`. Message Ronen: after merging, open Next week once (the first match runs then), check the meal cards, and use the fix buttons only for what's still wrong.
