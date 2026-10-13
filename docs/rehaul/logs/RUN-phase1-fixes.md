# RUN-phase1-fixes: Phase 0 + 1 preview bugs

Six bugs from Ronen's preview testing, fixed on `rehaul_phase1`, one commit each, pushed after each.
Every bug was reproduced in the running app first (local Postgres 16, `next dev` on port 3210, Playwright at 390 px and 1280 px, real Claude with the dev key) unless noted below.

## Built
1. **Edit window scrolls.** The top of the form ("Type of recipe", the title) is reachable on a phone and on a laptop, and the Update/Create and Cancel buttons sit in a bar that stays at the bottom of the screen.
2. **"Update Recipe" saves the steps.** Editing a recipe with steps, a timer and ingredient mentions now saves reliably, also when the database is slow or far away.
3. **Accepting an Inspire Me suggestion imports it properly.** Accept runs the suggestion's link through the recipe importer (same agent as Import). Method, servings and steps come in, then the normal review screen asks to "Save to recipe book". The card says "Added!" only once the recipe is saved; Discard leaves it open to accept again.
4. **Progress feedback.** Inspire Me, Import, meal plan "Generate with AI" and shopping list "Generate Shopping List" show a status box: what is happening, seconds elapsed, a bar, and "Usually takes N-M seconds".
5. **Meal plan AI fill fills the grid.** Empty slots are filled and show at once; slots you had filled stay exactly as they were.
6. **`/api/env-check` removed.**

## Commits
| Bug | Commit |
|---|---|
| 1 edit window | `52a4e79` |
| 2 steps not saved | `89fd32f` |
| 3 Inspire accept | `ea8b83e` |
| 5 meal plan fill | `19d51d4` |
| 6 env-check | `7fd22e6` |
| 4 progress | `9b0de89` |

## Per bug: cause, fix, test, what I checked

### 1. Edit window does not fit and will not scroll
- **Cause.** `RecipeModal` made the overlay both the scroll container (`overflow-y-auto`) and a flex box that centres its child (`items-center`). When the card is taller than the screen, a centred child overflows equally above and below, and the part above the top edge cannot be scrolled to. Measured before the fix: the title was at y = -447 px on the phone and -565 px on the desktop, with nothing to scroll back to.
- **Fix.** `app/recipes/components/RecipeModal.tsx`: the overlay only scrolls; inside it a `min-h-full` wrapper (top-aligned on phones, centred from `sm` up, which is safe because the wrapper grows with the card) holds the card. `components/recipe/RecipeEditor.tsx`: the Update/Create + Cancel row is `sticky bottom-0` with a solid background, so the save button is always on screen. The Inspire and Import modals already scrolled (their card has `max-h-[90vh] overflow-y-auto`), so I left them alone.
- **Test.** `app/recipes/components/RecipeModal.test.tsx` pins the layout contract (jsdom has no layout, so it checks the classes that caused the bug: the scroll container must not be a centring flex box, the wrapper must be able to grow, the save row must be sticky).
- **Checked in the app (390x780, 1280x800, and a short 1280x560 laptop).** Title at y = 24-40 px when opened, "Type of recipe" visible; scrolling to the end puts the last field in view and scrolling back returns to the title; the Update Recipe button is inside the viewport at all three positions on all three sizes. Screenshots were reviewed by me; none are committed.

### 2. Steps added in Edit are not saved by "Update Recipe"
- **What I tried first (did not reproduce).** In the local app, editing a recipe from the book and from the recipe page, adding 2-3 steps, a timer, and an ingredient mention (typed and via "Insert ingredient") always saved correctly (PATCH 200, steps in the database, page showed the method). So it is not the form, not the payload, not the PATCH route's handling of `steps`, and not bug 1.
- **Cause (reproduced by simulating a slow database).** `updateRecipeFromForm` runs inside a Prisma *interactive transaction*, which Prisma cuts off after **5 seconds** by default ("Transaction already closed / not found"; the whole save is rolled back). The function did one `UPDATE` per ingredient, one after the other, so a recipe with N ingredients cost about N+8 round trips to the database. Locally a round trip is under 10 ms; on the preview the database is remote (Neon, pooled, can be cold), so a normal recipe could cross 5 s, the save failed and nothing (steps included) was stored. I reproduced it two ways: with a TCP delay in front of Postgres (100 ms each way, 8-ingredient recipe: `FAILED after 5073 ms: Transaction API error`), and in the integration test below. **I could not run against the real preview database, so this is the best-supported cause, not a confirmed one.** The error does show as a short toast on the preview, which is easy to miss on a phone.
- **Fix.** `lib/recipeWrite.ts`: (a) only ingredient rows that actually changed are updated (steps-only edits now do zero ingredient updates), (b) new ingredients go in with one `createMany`, (c) the transaction limit is raised to 30 s (`TRANSACTION_OPTIONS`, wait 10 s) as a safety net. Ids stay stable, so step tokens keep working.
- **Test.** `tests/integration/recipe-write.integration.test.ts`: "saves steps on a recipe with many ingredients even when every query is slow" wraps the Prisma client so every query waits 300 ms (a stand-in for the round trip), saves 12 ingredients + 2 steps and asserts it finishes under 5 s and the steps are stored. I ran it against the old code: it fails with the exact "Transaction already closed ... timeout 5000 ms, 5152 ms passed" error; with the fix it passes. A second test covers a changed + a new ingredient in the same save.
- **Re-checked in the app.** Edit from the recipe page and from the book, steps with timer and ingredient token: saved and shown.

### 3. Accepting an Inspire Me suggestion does not fill in the method
- **Cause.** `RecipesClient.onAcceptSuggestion` posted the suggestion straight to `/api/recipes/create`. A suggestion only has name, URL and an ingredient text (that is what the discover tool returns), so the saved recipe had no steps, no servings and no amounts. Reproduced in the app (before): accepting the suggestion showed "Added!" and the database row had 0 steps and no servings.
- **Fix.** Accept now opens the same Import modal on the suggestion's URL and starts it at once (`RecipeImportModal` got `initialInput` and `autoStart`; a ref stops React strict mode from starting two paid runs in dev). The existing review screen then shows method, servings and steps with "Save to recipe book" / "Discard". The Inspire card shows "Added!" only if the recipe was saved (`onAccept` now resolves true/false). The Import modal is rendered after the Inspire modal so it stacks on top and you land back on the suggestions list. A suggestion without a URL falls back to importing "name: ingredients" as a description. A page that cannot be read gives the importer's normal red message with "See what happened".
- **Tests.** `app/recipes/components/RecipesClient.inspire.test.tsx`: accepting calls `/api/recipes/import` with the suggestion URL, never `/api/recipes/create`, shows the review screen with the method, saves via `/api/recipes/import/save`, and marks "Added!"; discarding does not mark it.
- **Checked in the app (phone and desktop).** Accept -> progress box -> review screen after about 6-7 s with 4 steps -> Save -> card "Added!" -> database row: servings 4, 4 steps, tier "new", source URL kept.
- **What was real and what was a fixture.** The importer and Claude were real. The page was a fixture (`http://127.0.0.1:4455/jsonld.html`, a schema.org recipe page served from a scratch folder with `ALLOW_PRIVATE_FETCH=1`) because the sandbox cannot reach recipe sites. The Inspire result was a **stub** (Playwright intercepted `/api/recipes/discover` to return one suggestion pointing at the fixture), for the same reason: real Inspire results point at real sites. A separate run of the *real* discover call (real Claude web search) returned suggestions fine, see bug 4.

### 4. No progress feedback on slow AI actions
- **Cause.** Only a button label changed ("Searching...", "Generating..."), and the Import hint said "up to a minute".
- **Design (UX change Ronen asked for).** One small reusable component, `components/AiProgress.tsx`:
  - Props: `active`, `label` (what is happening), `estimate` as `[low, high]` seconds. It renders nothing when `active` is false.
  - Shows: "<label>...", elapsed seconds on the right, a thin bar, and "Usually takes low-high seconds."
  - The bar is **honest, not a percentage**: the server cannot report progress, so it eases towards 90% (about 57% at half the high estimate, 78% at the high estimate) and then waits; it never reaches 100% on its own and disappears when the action finishes.
  - If the action runs past the high estimate the text changes to "Taking longer than usual. Still working, please keep this open." The counter keeps running.
  - `role="status"` with `aria-live="polite"` and a `role="progressbar"`, works in light and dark, no animation other than the bar width.
  - Placement: inside the modal under the input for Inspire Me and Import; between the header buttons and the grid on the meal plan page; above the tabs on the shopping list page. The buttons keep their own "Searching..." / "Generating..." labels.
  - Estimates: Inspire Me 8-30 s (real searches took 6-8 s in the sandbox; S01 recorded 15-60 s, so the upper bound covers slow days), Import 5-20 s (S05: 4-16 s), meal plan fill 10-20 s (measured 9-13 s), shopping list 5-20 s (**a guess**, not measured here: no OpenAI key for embeddings in this environment).
  - Not covered because they are not slow or not user-facing: the single master-item/ingredient normalisation on save (Haiku, around a second, runs after the save and never blocks it), the backfill CLI.
- **Tests.** `components/AiProgress.test.tsx` (inactive renders nothing; label, estimate and bar; elapsed counter and bar advance with fake timers; "taking longer" text; reset on finish; bar never passes 90). `RecipesClient.inspire.test.tsx` checks Inspire shows "Searching the web for recipes" with its estimate while pending and Import shows "Reading the recipe" while pending, and both disappear when done.
- **Checked in the app (phone and desktop).** Real Inspire search at 6 s: "Searching the web for recipes... 6s, Usually takes 15-45 seconds (now 8-30), bar 21%"; Import at 3 s and meal plan fill at 3.5 s similarly; the box is gone once results appear. I did not exercise the shopping list one in the browser (needs the embeddings key), only compile and type checks.

### 5. Meal plan AI fill shows an empty grid
- **Cause.** The meal plan page sent each day's date as a UTC *timestamp* (`2026-10-11T21:00:00.000Z` for Monday 12 Oct in Israel). The server read it as the previous day, told the model "Monday (11/10/2026)" with its own time zone, the model answered with dates as UTC midnights one day off, and the client matched answers to rows by comparing dates. Outside UTC the match was off by one day: in London (UTC+1) and Jerusalem (UTC+3) only 24 of 28 slots filled and everything sat one day early (so locked meals were not kept); with other shapes of answer no day matches at all, which is the empty grid you saw with the explanation toast still showing. In a UTC browser it worked, which is why it never showed locally or in tests. Reproduced before the fix with Playwright set to `Europe/London` and `Asia/Jerusalem` (request dates `...T21:00Z`, response dates one day earlier, "Selected meals: 24/21" with the Sunday row missing and days shifted). Old shape: before the Claude swap the route returned the same `modifiedPlan: [{date, ...ids}]` and matched by timestamp too, so this bug existed there; Claude's answers made it show.
- **Fix.**
  - Client sends plain local calendar dates, `"2026-10-12"` (`formatDateParam`), not timestamps.
  - The server (`route.ts`, `modifyMealPlan.ts`) keeps them as strings and puts them in the prompt as given; the prompt and tool schema ask the model to echo the date exactly.
  - New `lib/ai/alignMealPlan.ts`: rebuilds the answer as exactly one entry per day we sent, dated as we sent it. It matches by date when every day is found, otherwise (garbled or shifted labels) by order when the same number of days came back. Every recipe id is checked: it must exist and fit its slot (lunch/protein/carb/vegetable); anything else becomes empty instead of a cell that renders blank.
  - Client `applyGeneratedPlanToWeek` compares `YYYY-MM-DD` with the row's local date (no time zone dependence) and has a `keepFilled` option, which the "Generate with AI" button uses so a slot you had filled is never overwritten. `useMealPlan.applyGeneratedPlan` now updates from the latest plan (functional update) instead of the plan captured when the request started.
- **Tests.** `lib/ai/modifyMealPlan.test.ts`: date echo formats, shifted labels (the bug) land on the right days, bad and wrong-slot ids blanked, skipped day left empty, an end-to-end `modifyMealPlan` with a scripted model that shifts its dates, the prompt contains the plain date, grid application with `YYYY-MM-DD`, and locked slots kept. These pass under `TZ=UTC`, `Asia/Jerusalem` and `America/Los_Angeles`. (`lib/mealPlanHelpers.test.ts` has 3 old `validateWeekStart` tests that fail under `TZ=America/Los_Angeles`; they failed before my changes too and are unrelated.)
- **Checked in the app (phone and desktop, browser time zones UTC, Europe/London, Asia/Jerusalem, America/Los_Angeles).** Two slots locked (Monday protein, Tuesday lunch), then "Generate with AI" with real Claude: "Selected meals 2" became 28, locked ones unchanged after Save (read back from the API), all 28 slots distinct. In UTC and the other zones the grid fills immediately with the explanation toast.
- **Data note.** The seed has no lunch or vegetable recipes, so for these runs I added 30 local "FIX ..." recipes (lunch, vegetable, carb, protein) to the local `mp_fix` database only. On a preview with the seed alone, Claude honestly says it cannot fill every slot and fills what it can; that is the data, not this bug.

### 6. Remove `/api/env-check`
- `app/api/env-check/` deleted (`git rm`); nothing else referenced it (only the fix-run brief). `GET /api/env-check` now returns 404 locally (was 200). `app/api/noDiagnosticRoutes.test.ts` fails if the folder returns. The MCP endpoint and its auth were not touched.

## Decisions
- **Bug 2 cause is "best supported", not confirmed on the preview.** I could not read the preview database or logs. The simulation shows the 5 s transaction limit makes the save fail on slow databases and the fix removes the dependency on speed (fewer queries, larger limit). If it still fails on the preview, the next thing to look at is the response of the PATCH (Network tab) or Vercel function logs for "Transaction".
- **Bug 3 uses the existing Import modal** (stacked above Inspire Me) rather than a new screen; the review screen is "the normal review screen" asked for. Accepting several suggestions in a row works (you return to the list after each).
- **Bug 5 is solved at both ends.** The server no longer trusts the model's labels or ids, and the client no longer compares timestamps. `keepFilled` is used by the Generate button only; the generic route and helper keep their previous replace behaviour so other callers (and the existing tests) are unchanged.
- **PlanEntryForAI.date and the modify result `date` are now `YYYY-MM-DD` strings** (types changed accordingly). Older cached clients that still send timestamps are handled (date part taken), with the same day-shift limitation as before.
- **Bug 4 estimates** come from measured runs where I had them (meal plan, import, Inspire) and a stated guess where I did not (shopping list).
- Inspire and Import modals were not restyled for scrolling: they already scroll.
- No schema changes, no new dependencies.

## How it works
- **Scrolling modal:** the thing that scrolls should not also be the thing that centres. The overlay scrolls; an inner box that is at least screen height holds the card.
- **Slow transactions:** a transaction is a held-open conversation with the database, and every question in it costs one network round trip. Fewer questions and a longer allowed time means it finishes even far from the database.
- **Aligning the AI's answer:** we never copy the model's output into the grid directly. `alignModifiedPlan` takes the days *we* asked about, finds the model's entry for each, and only keeps recipe ids that exist and fit the slot. Dates are plain calendar days everywhere, so time zones cannot move them.
- **AiProgress** is a timer plus a curve, `90 * (1 - e^(-t / (high/2)))`: quick at first, slower later, never 100%.

## Try on the preview
1. **Edit window:** Recipes, tap Edit on any recipe on your phone. You should see "Edit Recipe" and "Type of recipe" at the top, scroll all the way down, and the Update Recipe and Cancel buttons stay at the bottom of the screen the whole time.
2. **Steps:** in that Edit window add 2-3 steps (put a timer on one, use "Insert ingredient" in another), tap Update Recipe. The window closes and the recipe page (or the card's "Method" line) shows the steps with the timer. If you ever see a red "Failed to update recipe", tell me what recipe it was.
3. **Inspire Me:** Inspire Me, search, tap Accept on a suggestion. You should see a "Reading the recipe" box with seconds and an estimate, then the review screen with the method and servings; Save to recipe book, then the card says "Added!". (A site that blocks automated visitors gives a red message instead; that is the importer's normal behaviour.)
4. **Progress:** Inspire Me search, Import, Meal plan "Generate with AI" and Shopping list "Generate Shopping List" each show a box with a counter, a bar and "Usually takes N-M seconds".
5. **Meal plan:** lock a couple of slots (pick recipes), tap Generate with AI. The grid fills straight away, your locked ones are unchanged. Also confirm `/api/env-check` shows a 404 page.

## Handoff
- `components/AiProgress.tsx` is the one place for slow-AI feedback: `<AiProgress active label estimate={[low, high]} />`. Use it for any new AI action over about 2 s (later phases: cook mode helpers, backfill UI).
- `RecipeImportModal` accepts `initialInput` and `autoStart`; `RecipesClient` owns an `importRequest` and a `pendingAccept` promise so other entry points can open the importer on a URL the same way.
- `lib/recipeWrite.ts` exports `TRANSACTION_OPTIONS`. Keep any new multi-step write short on round trips; a remote database makes every extra query visible.
- `lib/ai/alignMealPlan.ts` is the pattern for any AI answer that must map onto our own rows: rebuild by our keys, validate ids.
- Local test data: the `mp_fix` database has 30 extra "FIX ..." recipes and a saved meal plan for the week of 12 Oct 2026. It is a scratch database; do not use it as a reference.
- Dev note: `Edit` clicks from Playwright at phone width must scroll the sticky bar into account (it covers the bottom 60 px of the screen).

## Test results
- Unit: 45 files, 531 tests pass (`npx vitest run --exclude 'tests/integration/**' --exclude '.claude/**' --exclude 'node_modules/**'`).
- Integration (database `mealplanner_test_fix`): 9 files, 57 tests pass.
- `npx tsc --noEmit`: clean before every push.
- `npm run build` with `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` unset, against a scratch database: passes (routes listed without `/api/env-check`).

## Proposed doc updates
- ARCHITECTURE: add `components/AiProgress.tsx`; `lib/ai/alignMealPlan.ts` (meal plan answers are aligned to the days sent, dates are `YYYY-MM-DD`); the importer modal can be opened on a URL (Inspire accept); `RecipeModal` scroll layout; remove `/api/env-check`.
- FEATURES: Inspire Me accept goes through the importer and review screen; progress box on slow AI actions.
- BACKLOG: (a) the preview's PATCH failure cause for bug 2 should be confirmed from Vercel logs; (b) fix the three `validateWeekStart` tests that depend on the machine time zone; (c) shopping list progress estimate is a guess, measure it; (d) the seed data has no lunch or vegetable recipes, so AI fill cannot fill every slot on a fresh database; (e) the Inspire "Reject" list is not persisted.
