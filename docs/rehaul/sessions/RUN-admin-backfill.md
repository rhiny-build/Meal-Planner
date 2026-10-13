# Run: admin page to run the recipe backfill from the app

Read `docs/rehaul/sessions/_common.md` first. Work unsupervised, use the `claude.md` message format, and follow the "Real Claude spend" rules.

## Why
The recipe backfill (S07, `scripts/rehaul/backfillRecipes.ts`) has to be run against production, but Ronen has no command line, and build sessions must never hold production secrets. So the backfill runs **inside the deployed app**, using Vercel's own settings.

## Branch
Work on **`rehaul_phase2_admin`** (it exists; check it out). Commit and push as you go. When done, open **one PR to `main`**, and don't merge it. Before every push, check the branch's PR isn't already merged (`claude.md`).

## Scope
1. **An admin page** (e.g. `/admin/backfill`), linked from Settings rather than the main menu.
2. **Dry run:** a button runs the existing backfill planning (enrich / mark quick / flag duplicate / leave) over the recipes, **reusing the S07 code**, without rewriting it. Show the results as a table, one row per recipe: proposed action, what would change, the reason, and a link to its agent run.
3. **Vercel's time limit:** a single request can't run for minutes. Drive it from the page **one recipe per request** (or a few), with a progress bar ("12 of 46") and a running token/cost total. If the page is closed mid-way, rows already done stay done; nothing gets corrupted.
4. **Review:** every row has a tick box. Enrich and quick rows are ticked by default. **Duplicate merges are unticked by default** and need an explicit tick.
5. **Apply:** applies only the ticked rows, again one recipe per request, using S07's apply logic, which only fills empty fields and never replaces existing steps. Re-running is safe: nothing gets applied twice.
6. **Model:** use whatever the importer is configured with (Haiku today).

## Out of scope
- Login or auth. The rest of the app has none either; note it in Known gaps.
- Any new database tables. Keep the report in the page. If you truly need storage, stop and ask.

## Testing
- Replayed responses for the per-recipe endpoints.
- At most 5 real recipes, against your local database (see "Real Claude spend").
- **Never run a full dry run yourself.** The real run is Ronen's, on production.
- Playwright at phone and desktop width.

## Finish
- Log: `docs/rehaul/logs/RUN-admin-backfill.md`.
- PR to `main`. Message Ronen: what to do on production after merging, step by step. He already has a Neon backup.
