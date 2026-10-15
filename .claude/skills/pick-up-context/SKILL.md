---
name: pick-up-context
description: Familiarise yourself with current project state before starting a new session
---

## Step 1 — Read Current State

On Ronen's own machine, read `~/.claude/projects/-Users-ronenelman-Meal-Planner/memory/MEMORY.md` first, if it exists. It says what's in progress, decided and next. In a cloud session it won't exist: skip it, and instead read `docs/rehaul/PLAN.md` and the newest logs in `docs/rehaul/logs/`, and check open PRs. (Rehaul build sessions don't use this skill at all; see `docs/rehaul/sessions/_common.md`.)

## Step 2 — Clarify the Task

Based on MEMORY.md, confirm with the user:
- What the next piece of work is
- Any blockers or open questions from the previous session
- Whether priorities have changed

Ask one question at a time. Do not start work until the task is clear and confirmed.

## Step 3 — Go Deeper If Needed

Only if the task requires it:
- Read `ARCHITECTURE.md` for the diagrams of the system, data model, agents and flows
- Read `BACKLOG.md` for broader priorities
- Read relevant files in `/docs/` for feature-specific context

Do not read everything by default — read what the task actually needs.
