---
name: pick-up-context
description: Familiarise yourself with current project state before starting a new session
---

## Step 1 — Read Current State

Read `~/.claude/projects/-Users-ronenelman-Meal-Planner/memory/MEMORY.md` first.

This is the source of truth for where the project currently is — what's in progress, what's decided, what's next.

## Step 2 — Clarify the Task

Based on MEMORY.md, confirm with the user:
- What the next piece of work is
- Any blockers or open questions from the previous session
- Whether priorities have changed

Ask one question at a time. Do not start work until the task is clear and confirmed.

## Step 3 — Go Deeper If Needed

Only if the task requires it:
- Read `ARCHITECTURE.md` for module structure and architectural decisions
- Read `BACKLOG.md` for broader priorities
- Read relevant files in `/docs/` for feature-specific context

Do not read everything by default — read what the task actually needs.
