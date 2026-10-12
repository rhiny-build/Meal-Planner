# Phase run: Phase 0 + Phase 1 (S01–S07)

You are the **orchestrator** for this phase. Read `docs/rehaul/sessions/_common.md` and `docs/rehaul/PLAN.md` first. The rules there apply to you and to every subagent you start.

## Goal
Build S01–S07 end to end on one phase branch, unsupervised. Finish with **one** PR from the phase branch to `main`, which Ronen tests on its Vercel preview and merges himself.

## Branches (strict)
- Phase branch: **`rehaul_phase1`**, created from `main`. Push it straight away.
- Each session works on **`rehaul_<id>_<short_name>`** (e.g. `rehaul_S01_claude_swap`), branched from the phase branch. Give each subagent its exact branch name.
- Ignore any default branch name the environment assigns. If a push to these names fails, tell Ronen in your first message.
- Never push to `main`. Never open a PR to `main`, except the final one.

## Existing work
S02 is already built on branch `claude/bold-franklin-mpgtde` (commit "Move day notes from localStorage to the database (S02)"). Bring it onto `rehaul_S02_day_notes` and treat it as S02's starting point. Before merging it, finish what it lacks:
- Try it in the running app.
- Show a small on-screen message when a save fails.

## Order
Run sessions in waves, as in PLAN.md. Run sessions in the same wave in parallel as subagents, each in its own worktree:
1. **Wave 1:** S01 + S02
2. **Wave 2:** S03 (alone; schema)
3. **Wave 3:** S04 + S05 + S06
4. **Wave 4:** S07 (**dry-run only**: produce the report against local data, and do not apply anything to production)

## Merging into the phase branch (you do this, not Ronen)
For each session, merge its branch into `rehaul_phase1` only when:
- Its tests pass (unit and integration) on the merged result.
- Its log file exists with every section from `_common.md`.
- You've run the app on the merged phase branch with local Postgres and checked the feature works.

If two sessions conflict, you resolve it, and record the resolution in your own log `docs/rehaul/logs/RUN-phase-0-1.md`.

Run docs-sync (`docs/rehaul/sessions/docs-sync.md`) on the phase branch after the last wave.

## When to involve Ronen
Only for the three reasons in `_common.md`: UX changes, blockers, real trade-offs. Collect non-urgent questions and ask them together, rather than one at a time. Use the `claude.md` message format.

**One planned learning moment:** when S05 (the recipe importer agent, the hand-written loop) is merged, message Ronen with a short walkthrough of the loop and one real run traced step by step. This one is FYI: don't wait for him.

## Finish
1. Open **one** PR: `rehaul_phase1` → `main`. In the description:
   - **What changed for you:** plain language, by feature.
   - **Try on the preview:** the combined list from all the session logs.
   - **Decisions I made without asking:** the combined list.
   - **Known gaps.**
2. Message Ronen in the `claude.md` format. "What I need from you" is: test the preview and merge.
