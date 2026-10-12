# Rehaul — how to run it

- `PLAN.md` holds the decisions, architecture, phases, waves and parallel-safe rules. Read this first.
- `sessions/` holds one prompt per build session, plus `_common.md` (the rules every session follows) and `docs-sync.md`.
- `logs/` holds one log per session, written by that session only.

## Running a session
In Claude Code, from the repo root, start a fresh session and say:

> Run the rehaul session in `docs/rehaul/sessions/S01-claude-swap.md`.

For parallel sessions in the same wave, start each one in its own session. Each one creates its own branch and worktree.

## Order
Wave 1: S01 + S02 → Wave 2: S03 → Wave 3: S04 + S05 + S06 → Wave 4: S07 → docs-sync → prompts for Phase 2 get written.

Merge each wave's PRs before starting the next wave. Run docs-sync whenever the docs feel behind, and at least at the end of each phase.
