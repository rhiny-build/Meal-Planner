# Fix run: Phase 0 + 1 bugs from Ronen's preview testing

Read `docs/rehaul/sessions/_common.md` first. Its rules apply: work unsupervised, use strict branch names, test it yourself, and use the `claude.md` message format.

## Branch
Work directly on **`rehaul_phase1`**. Commit per fix, and push after each one. Don't create other branches. Never push to `main`.

## Context
Ronen tested the phase on its Vercel preview (on a phone and a laptop). These all work and must keep working: recipe book browsing, day notes, Import, Agent Runs, and Inspire Me search.

## Bugs to fix
For **each** bug: reproduce it first in the running app (local Postgres plus the dev Claude key, using Playwright at phone width and desktop width). Then fix it, add a test that would have caught it, and re-check it in the running app.

1. **The recipe edit window doesn't fit on screen and won't scroll.** The top of the form ("Type of recipe") is cut off. It must scroll on a phone and on a laptop, with the save button always reachable.
2. **Steps added in Edit aren't saved by "Update Recipe".** Ronen added 2–3 steps with a timer on one, tapped Update Recipe, and they weren't saved. Find the real cause. Don't assume it's bug 1.
3. **Accepting an Inspire Me suggestion doesn't fill in the method.** Accepting should run the suggestion's URL through the recipe importer (the same agent as Import), so method, servings and steps come in, followed by the normal review screen.
4. **No progress feedback on slow AI actions** (Inspire Me, Import, and any other AI call over ~2 seconds). Show clearly that it's working, with a rough time estimate (e.g. "Usually takes 10–20 seconds") and a progress indication. This is a UX change, but Ronen has asked for it, so go ahead and record the design in your log.
5. **Meal plan AI fill shows an empty table.** The AI's message about what it did appears, but the grid shows nothing. Locked slots must stay; empty ones get filled and show up immediately.
6. **Remove the temporary `/api/env-check` route** (`app/api/env-check/`).

## Out of scope
- **Don't touch the MCP endpoint** or its auth. Ronen will discuss it separately.
- No new features.

## Finish
- Your log: `docs/rehaul/logs/RUN-phase1-fixes.md`, with each bug's cause, fix and test.
- Message Ronen in the `claude.md` format: what to try on the preview, one line per bug.
