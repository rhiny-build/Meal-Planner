# RUN-admin-backfill: run the recipe backfill from the app

Branch `rehaul_phase2_admin`. **Nothing was run against production, and no production secret was requested or used.** Everything below ran on a local scratch database.

## Built
- **A page at `/admin/backfill`**, linked from the bottom of Settings ("Admin: Recipe backfill"), not the main menu.
- **Dry run button.** Walks the book one recipe per request, using the S07 planning (enrich / mark quick / flag duplicate / leave). Shows one row per recipe: proposed action, what would change, the reason, and a link to its agent run on `/agent-runs`. A progress bar ("4 of 6") and a running token and estimated-cost total sit above the table.
- **Close the page part-way and nothing breaks.** Each request finishes on its own. The rows done so far are kept in the browser, so reopening the page shows them and "Continue dry run" only checks the recipes not done yet. "Stop after this one" pauses; "Clear report" starts over.
- **Review.** Every row except "leave" has a tick box. Enrich and quick rows start ticked. **Duplicate merges start unticked** and are only applied if ticked.
- **Apply button** ("Apply 4 ticked"). Applies only the ticked rows, one per request, with S07's apply logic: only empty fields are filled, existing steps are never replaced. Each row shows what happened ("applied: filled servings, 4 steps", "nothing-to-do", "skipped", "failed"). Repeating Apply changes nothing more.
- Model: whatever `AI_CONFIG.recipeImporter` says (Haiku today). No new database tables, no schema change.

## Decisions
- **Reused S07 by extracting one function, not rewriting.** `buildBackfillPlan` had the per-recipe decision inline in its loop. I moved it, unchanged, into exported `planRecipe` (and `needsAgent`) in `plan.ts`; the loop now calls it. The 49 existing backfill tests pass unchanged, and the script behaves the same. `applyEntry` in `apply.ts` was exported (one word added).
- **Three small endpoints under `/api/admin/backfill/`:** `recipes` (the list to walk), `plan` (one recipe), `apply` (one ticked row). `maxDuration = 60`, same as the import route. Heavy logic is in `lib/agents/recipeBackfill/adminSteps.ts`.
- **Merge approval.** The page only sends ticked rows, so a duplicate sent to `apply` counts as approved (the server sets `approved: true`). An unticked merge is never sent.
- **Apply endpoint checks the row's shape** (`entryShape.ts`) before touching the database; S07's own checks (recipe exists, same name, fields still empty) still run at apply time.
- **Report kept in the browser (localStorage), not the database**, as asked. This is a per-device convenience: if Ronen starts on the phone and continues on a laptop, he starts again. Storage being blocked only means no resume.
- **Cost figure is an estimate** from list prices in `lib/ai/pricing.ts` (taken from `RUN-cost-caching-haiku.md`), counting cache reads and writes. It shows nothing worse than a slightly wrong number if prices change.
- **No pause between recipes** (the script waited 3 s). The page runs one at a time and each import takes seconds, so the pace is already gentle. If Anthropic rate limits show up on production, a failed recipe is listed as "could not be checked" and "Continue dry run" retries it.
- **No token budget on the page.** The cost is shown live and "Stop after this one" is always there.
- The duplicate row still reads "merge into cmv…" (S07's wording, which names the recipe id). I left that alone as S07 wording; a plainer sentence would be a small follow-up.

## How it works
Vercel stops a request after about a minute, and the backfill takes minutes, so the **browser is the loop**. The page asks for the list of recipes, then calls `/plan` once per recipe and adds each answer to the table as it arrives. Apply is the same: one `/apply` call per ticked row.

The pieces that matter:
1. `planRecipe(recipe, group, deps, tokens)` in `lib/agents/recipeBackfill/plan.ts`: the S07 decision for one recipe (duplicate copy, has a link so ask the importer in enrich mode, looks quick, or leave). Both the S07 script and the page call it, so they cannot disagree.
2. `planBackfillRecipe` / `applyBackfillEntry` in `adminSteps.ts`: load the book (duplicate detection compares recipes), plan or apply one recipe, return the row plus the tokens that recipe used (read from its agent run).
3. `useBackfillRun.ts`: the two loops, plus saving the report so a closed tab can carry on.

Safety comes from S07's apply rules: fields are filled only when empty at that moment, a quick change only happens if the recipe has no method, a merge re-points meal-plan slots before deleting the copy, and each recipe is its own transaction. So a repeated or half-finished run cannot corrupt anything.

## Try on the preview
1. Settings: scroll to the bottom, tap **Recipe backfill**. You see the page with "Run dry run".
2. Tap **Run dry run** on a copy of the data you do not mind (preview uses the dev database). Watch "Checked: 12 of 46" and the token/cost total grow; rows appear as they finish.
3. Look at a duplicate row: its tick box is **unticked**. Enrich and quick rows are ticked. "Leave" rows have no tick box.
4. Tap an "Agent run" link: you see the page Claude read and what it submitted.
5. Tap **Apply N ticked**: each row gets a green line saying what was filled. Tap it again after reloading: rows say "nothing-to-do".

## Handoff: what to do on production after merging
1. Merge the PR into `main` and wait for Vercel to deploy it.
2. Confirm your Neon backup is current (you said you have one).
3. Open the live app, go to Settings, scroll to the bottom, tap **Recipe backfill**.
4. Tap **Run dry run** and leave the page open. It checks the recipes one at a time (the real 78 should take roughly 5 to 10 minutes and cost well under a dollar on Haiku). The cost figure is shown live. If you close the page, reopen it and tap **Continue dry run**.
5. Read the table. Untick any row you do not want. Merges are unticked: tick one only if you want that copy deleted. Tap "Agent run" on anything that looks odd.
6. Tap **Apply N ticked**. Wait until the button says "Apply 0 ticked". Any row that says `failed` can be retried by ticking it and applying again.
7. Check a few recipes in the Recipes list. If anything is wrong, restore from the Neon backup.
8. Afterwards, tell me and I will remove the page (or keep it, your call). There is **no login** on it (see Known gaps).

## Known gaps
- **No login or auth** on `/admin/backfill` or its endpoints, like the rest of the app. Anyone with the address can run a dry run (which spends Anthropic tokens) or apply a row. Apply is limited to the safe, fill-only changes plus ticked merges.
- The report is per browser. The apply results are not stored; the recipes themselves are the record.
- No automated browser test is in the repo (Playwright is not a project dependency). The Playwright checks below were run by hand.

## Testing
- `npm test`: 630 passed (new: pricing, entry-shape check, the three endpoints with mocked steps, tick defaults).
- `npm run test:integration`: 65 passed, including 8 new tests that replay a **real recorded importer run** (`tests/fixtures/backfillAdminCodRun.json`): plan writes nothing, apply fills empty fields, repeating changes nothing, existing steps are not replaced, merge keeps the meal-plan day, a renamed recipe is skipped.
- **Playwright against the running app and local Postgres**, at 1280 px and 390 px, with a 6-recipe local book (a trimmed copy of the synthetic S07 book: three with links, one quick, one family, one duplicate pair): stop part-way, reload, continue (only the remaining recipes are checked); a dry run changes no recipe; default ticks (merge unticked, no box on "leave"); apply sends only ticked rows; repeat apply changes nothing; ticking the merge deletes the copy and keeps the meal-plan day; no horizontal scroll; no console errors. The desktop dry run used real Claude; the phone run replayed the recorded responses.
- A full dry run was never run. The local book had 6 recipes on purpose.

### Real Claude spend
- 3 real importer runs (Haiku), all on the local fixture pages: 18 input + 3,757 output tokens, plus 15,082 cache-read and 5,134 cache-write tokens = **23,991 tokens**, about **$0.0027**. Budget was 150,000.

## Proposed doc updates
- **ARCHITECTURE.md:** add `/admin/backfill` and `app/api/admin/backfill/*` (recipes, plan, apply) under the app routes; add `lib/agents/recipeBackfill/adminSteps.ts` and `lib/ai/pricing.ts`.
- **FEATURES.md:** "Admin: run the recipe backfill from Settings (dry run, review, apply)". Mark as temporary if the page is removed after the real run.
- **BACKLOG.md:** auth for admin pages; plainer wording for duplicate rows (names rather than ids); optionally remove the page after the production run.
