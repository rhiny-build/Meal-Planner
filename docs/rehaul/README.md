# Rehaul — how to run it

- `PLAN.md` holds the decisions, architecture, phases, waves and parallel-safe rules. Read this first.
- `sessions/` holds one prompt per build session, plus `_common.md` (the rules every session follows) and `docs-sync.md`.
- `logs/` holds one log per session, written by that session only.

## Running a phase (default)
Start **one** cloud session on the repo and say:

> Run docs/rehaul/sessions/RUN-phase-0-1.md

(Phase 2: `RUN-phase-2.md`.)

It builds every session in the phase on the `rehaul_phase1` branch, using subagents, and tests them itself. It only interrupts you for UX choices, blockers or trade-offs. At the end it opens one PR to `main` for you to try on the preview and merge.
