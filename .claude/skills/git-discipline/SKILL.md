---
name: git-discipline
description: Commit and branching rules for all work on this project
---

## Branching

Always create a branch before making any changes:
`git checkout -b feature_short_descriptive_name`

Vercel only builds `main` and branches on the allow-list in `vercel.json` (currently `rehaul_phase*`). Any other branch name gets no preview deploy. If you need a preview, use a matching name or add the pattern to `vercel.json` in the same PR. Rehaul sessions use the branch name in their session prompt.

Good names: `feature_receipt_ingestion`, `fix_navigation_bug`
Bad names: `feature_1`, `fix`, `update`

## Committing

Commit after every discrete change before moving to the next.

Run `npm test` first — must pass. If tests fail, revert and report. DO NOT proceed.

**Commit automatically (no need to ask):**
- After completing a subtask or feature component
- After fixing a bug
- After adding or updating tests
- After a refactor
- Before switching to a different aspect of the work

**Ask before committing:**
- When unsure if current state is a good stopping point
- When changes span multiple unrelated concerns
- When the user is actively testing and might want to revert

## Commit Message Format

Short summary (imperative mood, 50 chars max)

What changed
Why it changed
Any important context or side effects

## Hard Rules

Never leave DB and code out of sync — if a migration runs, the code update goes in the same commit.

When unsure, ask one specific question. Wait for the answer. Never proceed on an assumption.

## Completing Work

When the work is complete and tested: update documentation, push the branch, and open a pull request to `main`. Do **not** merge it and never push to `main`: merging is a production deploy and Ronen does it after checking the preview. Before every push, check the branch's PR is not already merged or closed (see `claude.md`).

Note: the `push-to-prod` skill still describes a direct merge to `main`; it is flagged for Ronen to decide and is not to be followed.