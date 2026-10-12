# docs-sync — consolidate shared docs between waves

Run after a wave's PRs are merged, and before the next wave starts. Never run it alongside a build session.

Read `docs/rehaul/PLAN.md` (the "How sessions work" section) first.

## Goal
Shared docs reflect what was actually built. This is the **only** session that edits `ARCHITECTURE.md`, `BACKLOG.md`, `FEATURES.md` and `README.md` during the rehaul.

## Steps
1. List the logs in `docs/rehaul/logs/` for sessions merged since the last docs-sync. Use `git log` on `main` to see which ones. The last docs-sync commit message names the sessions it covered.
2. Apply each log's "Proposed doc updates". Where proposals conflict, the code on `main` is the source of truth. Check it, and note the resolution in the commit message.
3. Bring the project-structure section of `ARCHITECTURE.md` up to date with the code (it's been stale since Feb). Remove OpenAI-as-chat references.
4. Close or reword backlog items the rehaul has superseded (e.g. the URL extraction P1 bug).
5. Branch `rehaul_docs_sync_<YYYYMMDD>`. One PR. Commit message: `docs-sync: S0x, S0y, …`.
6. Don't edit `PLAN.md`, the session prompts or the logs. If the plan looks out of date, list what you'd change in the PR description for Ronen.
