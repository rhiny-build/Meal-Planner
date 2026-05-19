---
name: feature-planning
description: Process for planning and executing features, especially multi-file changes, new modules, and refactors
---

## Before Writing Any Code

For anything beyond a simple fix, create a design doc in `/docs/` covering:
- Overview and data model
- User workflow
- Architecture approach (how it fits the module pattern)
- Implementation phases with outcomes
- Open questions

## Structure Work in Phases

Break work into small end-to-end milestones. Each phase must have:

**Clear outcome** — what can the user do at the end that they couldn't before? Not "code is written" but "user can X."

**Implementation tasks** — specific work items

**Tests** — what tests are needed (unit, integration)

**Docs** — what documentation needs updating

## Modular Design

Design for modularity before writing code, not after:
- Components should have a single clear responsibility
- Extract logic to utility functions early — don't wait until a file is too long
- Component files: aim for 100–150 lines, 250 is the hard ceiling
- API routes: max 50 lines per handler
- Business logic: max 200 lines with clear sections
- If a component needs to be larger, that's a signal to decompose it first

## Phase Completion Criteria

A phase is only done when:
- The outcome is achieved and working
- Tests are written and passing
- UI changes validated via Playwright MCP (see `ui` skill)
- Relevant docs are updated

## Architecture

For module structure, server actions vs API routes, and other architectural decisions, always refer to ARCHITECTURE.md before making structural decisions.

Key patterns:
- **Server components** for data fetching (reads)
- **Server actions** for mutations (writes)
- **API routes** only for external integrations (AI, webhooks)