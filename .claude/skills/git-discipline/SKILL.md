---
name: git-discipline
description: Commit and branching rules for all work on this project
---

## Branching

Always create a feature branch before making any changes:
`git checkout -b feature_short_descriptive_name`

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

When feature is complete and tested, ask the user to run `/push-to-prod` and follow the directions there.

After approval: merge to main, update documentation, commit, push, delete the feature branch:
`git branch -d feature_branch_name`