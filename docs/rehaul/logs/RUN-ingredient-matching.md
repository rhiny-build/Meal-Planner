# Log: ingredient matching for Next week

Branch `rehaul_phase_matching`, one PR to `main` (not merged).

## Built
- Next week's meal cards now match each recipe ingredient to one of your items by **meaning**, not shared words. "Sweet Corn" is sweetcorn (not sweets), "Mayo" is mayonnaise, "Fries" are oven chips, "Ground Turkey" is turkey mince, "El Paso Tortilla Kit" is a fajita kit.
- Each distinct ingredient name is worked out **once** and saved (new table `IngredientMatch`). Opening Next week never calls the model for a name that already has an answer.
- A name the model can't place shows **"check"**, unticked, until you pick. A name you don't buy shows its plain name, unticked, "Not one of your usual items" (no "check").
- **Wrong product?** on a matched line, **Which product is it?** on a "check" or not-bought line: a searchable list of your items plus "I don't buy this". The pick is saved against the ingredient name, applies to every recipe using it, is marked as yours and is never overwritten.
- Cupboard rule: last bought more than 2x its usual gap ago is unticked, "Not bought for a long time, check". Between 1.5x and 2x it stays ticked as "likely out".
- "Fresh" is said only for fresh aisles (fresh produce, dairy and eggs, meat and deli, fish, bakery). Everything else says "For Tue".

## Quality score (353 real ingredient names, 295 scored)
`tests/fixtures/matching/cases.json`: every distinct name from the 79 production recipes, each with an expected item or "not bought" (generic item names only). 50 names are marked `unsure` (more than one answer is defensible, e.g. "Salt and pepper", "Fresh herbs", "Peppers") and left out of the score; **that is 14% of the names, so please skim them** (`"unsure": true` in the file). Ronen's real items aren't in the repo, so the item list is the 49 distinct item names in `classify-sample.json` plus 84 obvious generic ones. "Garlic powder" is deliberately *not* in the item list, so the right answer is "not bought" (as the table allows).

| | Table rows (8) | The rest (295 scored cases) |
|---|---|---|
| Old word matcher | 0 / 8 | 244 / 295 = 82.7% |
| New matcher (exact match, then the cheap model) | **8 / 8** | **292 / 295 = 99.0%** |

The 3 misses, left as labelled (I did not change a label after seeing the result):
- Campari tomatoes: expected tomato, got cherry tomatoes
- Chicken Stock: expected stock cube, got "not bought"
- Tbsp. shallots: expected "not bought", got onion

Re-run: `npx tsx scripts/rehaul/scoreIngredientMatching.ts old` or `new` (free, from the recorded answers in `tests/fixtures/matching/recorded-answers.json`). `new --record` is a real full model run, `new --record-missing` asks only for names without a recorded answer. A unit test (`lib/nextWeek/scoreMatching.test.ts`) fails if the new matcher drops below "all 8 table rows and 95%".

## Side by side: one week
Made-up shop history and five recipes using every table row (`npx tsx scripts/rehaul/seedMatchingDemo.ts`, then `npx tsx scripts/rehaul/sideBySide.ts`):

| Meal | Ingredient | Old match | New match |
|---|---|---|---|
| Chicken Fajita Wraps | Chicken strips | no match (check) | chicken breast |
| Chicken Fajita Wraps | El Paso Tortilla Kit | no match (check) | fajita kit |
| Chicken Fajita Wraps | Sweet Corn | sweets | sweetcorn |
| Chicken Fajita Wraps | Grated Mozzarela | no match (check) | grated mozzarella |
| Chicken Fajita Wraps | Red Pepper | red pepper | red pepper (exact) |
| Turkey Pasta Bake | Ground Turkey | no match (check) | turkey mince |
| Turkey Pasta Bake | Garlic powder | garlic | not bought |
| Turkey Pasta Bake | pasta | pasta | pasta (exact) |
| Turkey Pasta Bake | Tomato Puree | tomato puree | tomato puree (exact) |
| Turkey Pasta Bake | Dressing | no match (check) | not bought |
| Burger Night | Burgers | burger buns | not bought |
| Burger Night | Mayo | egg mayo filler | mayonnaise |
| Burger Night | Fries | halloumi fries | oven chips |
| Burger Night | Lettuce | lettuce | lettuce (exact) |
| Burger Night | Burger Buns | burger buns | burger buns (exact) |
| Salmon and Rice | salmon fillet | salmon fillet | salmon fillet (exact) |
| Salmon and Rice | Rice | basmati rice | basmati rice |
| Salmon and Rice | Soy sauce | soy sauce | soy sauce (exact) |
| Salmon and Rice | Fresh ginger | ginger | ginger (exact) |
| Salmon and Rice | Saffron | no match (check) | not bought |
| Halloumi Salad | Hallumi | no match (check) | halloumi |
| Halloumi Salad | Cucumber | cucumber | cucumber (exact) |
| Halloumi Salad | Cherry Tomatoes | cherry tomatoes | cherry tomatoes (exact) |
| Halloumi Salad | olive oil | olive oil | olive oil (exact) |
| Halloumi Salad | Fresh herbs | no match (check) | unsure (check) |

Old behaviour kept: sections, ticks kept until the order date, "see Tue" greying, "for Mon + Thu", Copy for Sainsbury's, the product Edit (item and aisle) and the old shopping list behind its Settings switch are unchanged (existing tests for them pass). What changed on purpose is only what the brief lists: which item an ingredient means, the "check" rule, the fix buttons, the 2x cupboard cap, and the "Fresh" label.

## Decisions
- **Saved key.** An answer is saved per lower-cased name with brackets and anything after a comma removed and only letters kept, **filler words kept**. "chopped tomatoes" and "tomatoes" are different names (the old word-normalising would merge them).
- **Exact match** (no model): the same words with plurals ignored; or the same words once filler is dropped *only if exactly one item fits*. Found while testing: "Tomatoes" went to "chopped tomatoes" because both items reduce to "tomato"; now they are told apart.
- **Not bought vs check.** The brief says only "unsure" shows "check", so a name saved as "not bought" shows its plain name unticked with "Not one of your usual items". It still gets the fix button, labelled "Which product is it?" (same as a "check" line).
- **Several wordings on one line** ("salmon" in one recipe, "salmon fillets" in another): a fix is saved against every wording on that line, not only the first.
- **Re-asking when items change.** Each model answer stores a fingerprint of your item list. "Not bought" and "unsure" answers are asked again when the fingerprint differs (any new or removed item); "matched" answers and your own picks are not. A re-ask that now has an exact match is saved as exact without the model.
- **Model says an item that isn't on your list** is treated as "unsure", never saved as a match.
- **If the model call fails** (no key, API down): nothing is saved for those names, the page still loads and the lines show "check"; they are tried again on the next visit.
- **"Fresh" aisles:** fresh produce, dairy and eggs, meat and deli, fish, bakery. Frozen counts as not fresh ("For Tue").
- **Old word matcher** (`matchIngredient`) is no longer used by the list; it stays only as the "before" side of the score.
- **Where matching runs (every save path found):** recipe form create and edit (`lib/recipeWrite.ts`, which also serves the API routes and the method-capture save), the importer (`saveRecipeDraft`), MCP `create_recipe` and `update_recipe`. The **backfill** only fills servings, times, descriptions, notes and steps and never writes ingredient names, so it needs no hook. After a save the matching runs after the response is sent (`after()`) and never fails the save. With no API key it does nothing.
- **First run over the existing names.** Next week waits only for the names in next week's meals (up to 25 s); after it responds, the same visit matches the rest of the recipe book (up to 40 s). The first open after merging therefore covers all ~350 names.
- **Time limit.** I could not reach vercel.com from this session (host not allowed), so I did **not** read the current figures. I set `maxDuration = 60` on the page (the same value the existing admin routes use) and kept the page wait + background work inside it. Please check it against Vercel's docs. Measured here: the first match over all 353 names (190 needed the model) took **19 s** in 5 batches, 3 at a time, and is cut off by the budget if it ever runs long (answers already saved stay saved).
- Migration only adds a table.

## Real Claude spend (budget 150k)
About 80k tokens: full run 1 (`--record`) 21.8k in / 11.9k out; one extra name 3.3k / 0.1k; full run 2 (first-match timing) 18.4k in / 11.1k out; plus roughly 10k from loading the demo page with the real model (not metered). Unit and integration tests use recorded or scripted answers.

## How it works
Design: the list used to compare words, which can't tell sweetcorn from sweets. Now the *meaning* is decided by the cheap model, but only once per ingredient name, and the answer is saved. The list itself never asks the model; it only reads saved answers.

1. `resolveIngredientMatches` (`lib/nextWeek/resolveMatches.ts`): for a set of ingredient names it loads the saved answers, saves exact matches itself, asks the model for the rest in batches of 40 (3 at a time) with your whole item list (aisle, how often bought) in the cached system prompt (`matchPrompt.ts`), and saves what comes back. It never touches a row whose source is "ronen".
2. `buildNextWeekList` (`lib/nextWeek/buildList.ts`) takes those saved answers and does the rest as before: ticking rules, "for Mon + Thu", cupboard rule, Fresh label.
3. `setIngredientMatch` (`nextWeekActions.ts`) saves your pick as source "ronen".

A real run: "Sweet Corn" is not the same words as any item, so the model got it with the item list and answered `item: sweetcorn`; that was saved as model/matched. Next visit it was read from the table with no model call.

## Try on the preview
The preview has its own copy of the data, so it has your real recipes and receipts as of the copy. It needs `ANTHROPIC_API_KEY` set for previews (the matching uses it); if it is missing the lines will all say "check".
1. Open Next week on your phone. The first open may take a few seconds (it matches next week's meals), then check the meal cards: sweetcorn, mayonnaise, oven chips, turkey mince, fajita kit should be right, and Haribo/garlic/egg mayo should be gone.
2. Tap "Wrong product?" on any matched line, pick another item, then reload: it sticks.
3. Find a "check" line (or one saying "Not one of your usual items"), tap "Which product is it?", search, pick, reload: it sticks, and the same ingredient in another meal changes too.
4. Tap "I don't buy this" on one: it shows its plain name unticked.
5. Open another recipe from the recipe book, change an ingredient and save, then open Next week: the new name is already matched.
Could not be proven locally: Vercel's real time limit and the production build with Turbopack and Google Fonts (see below).

## Handoff
- `IngredientMatch` is the single source for "which item is this ingredient". Anything new that saves recipe ingredients should call `queueIngredientMatching` (`lib/nextWeek/queueMatching.ts`).
- Re-record the answers (`--record`) whenever `matchPrompt.ts`, the model in `lib/ai/config.ts` or the case set changes; budget about 35k tokens a run.
- Production mode: `npm run build` fails in this sandbox because Google Fonts can't be fetched (unrelated to this change). I built with `next build --webpack` and a stub for the fonts, ran `next start`, and ran the same Playwright flow against it (fix a matched line, fix a check line, "I don't buy this", reload, desktop width): all passed, no console errors.
- Playwright was also run against `npm run dev` at 390 px and 1280 px.
- Tests: `npm test` 787 pass, `npm run test:integration` 109 pass.

## Proposed doc updates
- ARCHITECTURE: add `IngredientMatch` to the data model; in the Next week flow show "ingredient -> saved answer (exact, model, you) -> list", and the after-save and after-page matching.
- FEATURES: Next week meal ingredients are matched by meaning; "Wrong product?" / "Which product is it?" fixes; cupboard 2x rule; "Fresh" only for fresh aisles.
- BACKLOG: a way to see and review all saved matches in one place; the old word matcher can be deleted once nobody needs the "before" score.
