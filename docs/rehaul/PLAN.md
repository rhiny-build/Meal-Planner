# Meal Planner Rehaul — Plan

Status of this document: **read-only for build sessions.** Only Ronen (or a dedicated planning session he starts) edits it. Build sessions never change this file — see "How sessions work" below.

## Why

Make the app agentic, and use a bigger codebase to learn how agents are built. Four goals:

1. **Recipe book** — full recipes live in the app (method, servings, timings), not just ingredient lists. Quick items (Simple Fries, Burgers) are first-class too.
2. **Cook mode and discovery** — the Claude.ai "cook now" experience: step by step, timers, servings scaling, conversational discovery, save straight to the book.
3. **Restock agent** — reviews Sainsbury's receipts and proposes items to add to the master list.
4. **Automation** — the agent drafts weekly meal plans from history and the week's activities; shopping list and basket get simpler.

## Decisions (agreed 11–12 Oct 2026)

| # | Decision |
|---|----------|
| D1 | **Recipe book first.** It is the foundation for cook mode, meal-plan drafting and restock matching. |
| D2 | **Two kinds of recipe:** `full` (may have a method, servings, timings) and `quick` (quick side or quick main, e.g. Simple Fries, Burgers). Both can fill any meal-plan slot. Meal-plan slots (lunch / protein / carb / veg) stay as they are. |
| D3 | **Method is always optional.** Never enforce it, never guess one. Any import that can't extract a method cleanly leaves it empty. |
| D4 | **Discovery in phases.** Phase A: discovery happens in Claude.ai and saves through the MCP server (upgrade `create_recipe`). Phase B: an in-app discovery chat agent, once the book and cook mode exist. |
| D5 | **Capture as you cook.** For recipes with no method, cook mode *offers* "tell me as you go" and saves the method at the end. Optional. |
| D6 | **Claude for all generative/agentic AI.** OpenAI (gpt-4o-mini) and Perplexity are removed. **Exception: OpenAI embeddings stay as they are** (known weak, parked — see "Parked"). |
| D7 | **Agent internals: hand-rolled first, SDK later.** The first agent (recipe importer) uses a hand-written tool loop on the Claude API, written to be read top to bottom. Later agents use the Anthropic TypeScript SDK's tool runner. Not the Claude Agent SDK (poor fit for Vercel serverless). |
| D8 | **Restock agent is rebuilt inside the main app.** `restock-agent/` is untested WIP: treat it as a spec plus a reusable Sainsbury's receipt parser, then delete it. Proposals surface on the shopping list page. |
| D9 | **Agent runs page.** Every agent records its runs (inputs, each tool call, reasoning, outcome) to the DB, viewable on one page. This is the debugging and learning tool for all agents. |
| D10 | **Receipts: upload first, automate later.** Upload the Sainsbury's order PDF in the app (Vercel Blob is already a dependency). Email forwarding or a Gmail pull come later. |
| D11 | **Meal-plan input = day notes + chat.** Day notes on the plan grid become the stored record (moved from browser localStorage to the DB). Chat ("swap Wednesday for fish") is another way to write notes and request changes. |
| D12 | **One-off backfill of existing recipes** (78 today): enrich the ~45 with URLs, reclassify ~15 as quick, flag duplicates; the ~15 family recipes stay as they are until captured. Dry-run report first, apply after review. |
| D13 | **Shopping is a Sainsbury's online delivery.** Basket automation means browser automation (no public API) — a later spike, not a commitment. |

## Who does what

Ronen sets direction, reviews design and reads the code. Claude Code writes the code. Every build session therefore ends with a **walkthrough**: what was built (design first), the few pieces of code that matter, and — for agents — where the loop is and what each tool does. Sessions are kept small enough to review in one sitting.

## Target architecture (sketch)

```
lib/ai/
  claude.ts            Anthropic client + model config (replaces OpenAI chat use)
  embeddings.ts        OpenAI embeddings — unchanged (D6 exception)
lib/agents/
  runLog.ts            records AgentRun + AgentStep (D9)
  loop.ts              the hand-rolled tool loop (D7) — used by the importer
  recipeImporter/      tools + prompt
  capture/             capture-as-you-cook
  discovery/           in-app discovery chat (Phase B)
  mealPlan/            draft-week + modify agents (SDK tool runner)
  restock/             restock agent (SDK tool runner)
app/recipes/           recipe book: browse, recipe page, edit
app/recipes/[id]/cook  cook mode
app/agent-runs/        agent runs page
lib/mcp/tools/         upgraded create_recipe, + get_recipe, update_recipe, plan tools
```

Model choice lives in one config file. Default: `claude-sonnet-5-5` for agents, `claude-haiku-5-5` for cheap high-volume calls (ingredient normalisation). Check the SDK docs for current tool and model identifiers rather than trusting this list.

### Recipe data model (direction, finalised in S03)

- `Recipe` gains: `kind` (`full` | `quick`), `servings`, `description`, `totalTimeMinutes`, `notes`. `recipeUrl` stays as it is (no renames).
- `RecipeStep` (new): `recipeId`, `order`, `text`, `timerSeconds?`. Step text may reference ingredients by id (e.g. `{ing:abc123}`) so cook mode can show **scaled amounts inline**.
- `Ingredient` gains a numeric `amount` (alongside the existing free-text `quantity`) so servings scaling works. Free text stays as the fallback when the amount can't be parsed.
- Legacy `Recipe.ingredients` text column: keep for now, drop in a later clean-up once nothing reads it.
- `AgentRun` / `AgentStep` (new): agent name, trigger, input, status, steps with tool name, input, output, timestamps, token usage.
- `DayNote` (new, S02): `date` (unique), `text`.

## How sessions work (parallel-safe rules)

These exist so parallel Claude Code sessions never fight over shared mutable state.

1. **The plan and the session prompts are inputs, never outputs.** No build session edits `PLAN.md` or any file in `sessions/`.
2. **Status comes from git, not a document.** A session is done when its PR is merged to `main`. There is no shared progress tracker.
3. **Each session owns exactly one log file:** `docs/rehaul/logs/<session-id>.md`. It holds what was built, decisions taken, handoff notes for later sessions, and *proposed* updates to shared docs. Nothing else writes to it.
4. **Shared docs (`ARCHITECTURE.md`, `BACKLOG.md`, `FEATURES.md`, `README.md`) are not edited by build sessions.** A dedicated **docs-sync** session runs between waves, reads the logs, and updates them in one go. (This overrides the repo's "always update documentation" rule for rehaul sessions only.)
5. **Do not use `pick-up-context` / `MEMORY.md` for rehaul sessions.** Context comes from this plan, the session prompt, and earlier sessions' logs.
6. **One schema migration in flight at a time.** Only sessions marked `schema: yes` touch `prisma/schema.prisma`, and no two of them run in the same wave.
7. **One branch, one worktree, one PR per session.** Use the PR preview (own Neon branch) to test; see "Branches, testing and promotion". Branch name `rehaul_<session-id>_<short_name>`. Do not merge to `main` yourself — open a PR and stop; Ronen merges. (This overrides `push-to-prod`'s merge step for rehaul sessions.)
8. **Production data is touched only by explicit apply steps** that Ronen runs after reviewing a dry-run report. Take a DB backup first.

## Branches, testing and promotion to main

The app is in daily use, and merging to `main` **is** a production deploy. These rules apply to every rehaul PR.

### Environments
| Environment | Code | Database |
|---|---|---|
| Production | `main`, auto-deployed by Vercel (`family-meal-planner`) | Neon main branch (live data) |
| Preview | Each PR branch, auto-deployed by Vercel with its own URL | Its own Neon branch `preview/<git-branch>`, a copy of production made when the preview is built and deleted when the git branch is deleted (Neon–Vercel integration, set up 12 Oct 2026) |
| Build sessions | Claude Code worktree | A Neon `dev` branch (to be set up before S02) — never production |

- `DATABASE_URL` is pooled (runtime). `DATABASE_URL_UNPOOLED` is direct (Prisma migrations, via `directUrl`). Both are injected by the integration.
- The Vercel build runs `prisma migrate deploy`. On a preview, that changes only the preview's own Neon branch.

### Branches
- `main` only changes through a PR. Nothing is pushed straight to it.
- One short-lived branch per session. Merge within days, not weeks.

### Testing before merge
1. **CI check** (GitHub Actions) on every PR: unit tests, type check, build. It must be green.
2. **Preview check by Ronen**: open the PR's preview URL on a phone and try the feature against the preview's copy of real data. Each session's walkthrough ends with "what to try on the preview".
3. Schema PRs: also confirm the preview's Neon branch shows the new tables or columns.

### Promotion to main
- **Database changes only add** (new tables, new nullable columns, new columns with defaults). Renames and drops go in a separate, later PR, once nothing reads the old shape. That keeps a code rollback safe: Vercel's instant rollback restores old code, and the database still works with it.
- **Neon backup before merging any schema PR**: create a branch from main called `backup/<YYYYMMDD>-<session-id>` in the Neon console. It takes seconds.
- **Big new screens sit behind a switch** (a `SystemSetting` flag) until they're ready. The old screen keeps working until the new one replaces it.
- **Don't merge on the day of the weekly shop**, or right before it.
- **If production breaks:** Vercel → Deployments → previous deployment → *Instant Rollback*. Then fix forward in a new PR.

## Branches, testing and promotion

`main` is production: every merge deploys to the live app, which is used daily.

- **Branches:** `main` changes only through a PR. One short-lived branch per session; merge small and often.
- **Previews:** every PR gets a Vercel preview with **its own Neon database branch** (`preview/<git-branch>`, a copy of production, deleted with the branch). Try the change on the preview URL, on a phone, before merging.
- **Checks:** a GitHub Action runs the type check and unit tests on every PR (the build is checked by the Vercel preview). Later PR: run `tests/integration` in CI against a throwaway Postgres service container, and Playwright smoke tests against the preview.
- **Database changes are additive only.** Add tables/columns; removing or renaming is a separate, later PR once nothing uses the old shape. This keeps Vercel's one-click rollback safe, because old code still works with the new database.
- **Before merging a schema change:** confirm the preview works on its Neon branch, and note the time (Neon can restore production to a point in time).
- **Big new screens** (recipe book, cook mode) sit behind a setting until ready; the old screens keep working.
- **Timing:** don't merge just before the weekly shop.
- **Build sessions** use a permanent Neon `dev` branch for `prisma migrate dev` and tests — never production.

## Phases, sessions and waves

Sessions in the same wave can run in parallel. A wave starts when the previous wave's PRs are merged.

Detailed prompts exist for Waves 1–4. Prompts for later waves are written when we get there, so they're based on what was actually built rather than going stale.

### Phase 0 — Foundations

| Wave | Session | Schema | Outcome |
|------|---------|--------|---------|
| 1 | **S01 Claude swap** | no | All generative AI runs on Claude; OpenAI used only for embeddings; Perplexity removed (discovery temporarily off or Claude-backed). |
| 1 | **S02 Day notes to DB** | yes | Day notes persist in the DB, survive across devices and weeks, readable by agents. |

### Phase 1 — Recipe book

| Wave | Session | Schema | Outcome |
|------|---------|--------|---------|
| 2 | **S03 Recipe + agent-run schema** | yes | Schema for full/quick recipes, steps, numeric amounts, agent runs. Existing data intact. |
| 3 | **S04 Recipe book UI** | no | Browse the book, open a recipe page (ingredients, method if any), edit, mark full/quick. |
| 3 | **S05 Recipe importer agent + runs page** | no | Paste a URL or describe a recipe → agent builds a structured recipe for review → save. Hand-rolled loop. Every run visible on `/agent-runs`. |
| 3 | **S06 MCP upgrade** | no | From Claude.ai: discover a recipe, save it with method/servings/kind; get and update recipes. (Discovery Phase A.) |
| 4 | **S07 Backfill existing recipes** | no | Dry-run report for all 78 recipes (enrich / reclassify quick / duplicates / leave alone); apply step after review. |
| — | docs-sync | no | Shared docs updated from S01–S07 logs. |

### Phase 2 — Cook mode and discovery

| Session | Outcome |
|---------|---------|
| S08 Cook mode | Step-by-step view, timers on steps, servings scaling inline in step text, works on a phone propped on the counter. |
| S09 Capture as you cook | For a recipe without a method, optionally narrate as you cook; agent structures it into steps; you approve; saved. |
| S10 In-app discovery chat | Chat agent with web search, search-my-book and save tools; streaming UI. (Discovery Phase B.) |

### Phase 3 — Meal-plan agent

| Session | Outcome |
|---------|---------|
| S11 Modify agent on SDK tool runner | "Swap Wednesday for fish" works through a tool-using agent (replaces `modifyMealPlan`). First use of the SDK tool runner. |
| S12 Draft-week agent | From day notes + past plans + recipe tiers + recently cooked, drafts the week with a reason per day; accept/tweak. Button, plus optional Sunday schedule. |
| S13 MCP plan tools | Draft or adjust the week from Claude.ai. |

### Phase 4 — Restock agent

| Session | Outcome |
|---------|---------|
| S14 Receipt upload | Upload a Sainsbury's order PDF → stored in Blob → parsed (port `restock-agent/lib/parseReceipt.ts`) → `PurchaseHistory`. Check what historic receipt data is already in prod first. |
| S15 Restock agent | The four-outcome flow (staple filter → recipe-only filter → auto-accept high confidence → proposals for low confidence → watching for one-offs) as a tool-using agent. Proposals on the shopping list page; runs on `/agent-runs`. |
| S16 Remove `restock-agent/` | Old sandbox deleted once S14–S15 cover it. |
| S17 Receipt automation | Email forwarding or Gmail pull (decide then). |

### Phase 5 — Shopping

| Session | Outcome |
|---------|---------|
| S18 Shopping list tidy | List ordered by Sainsbury's categories, fast tick-off on a phone. |
| S19 Basket spike | Explore browser automation to fill the Sainsbury's basket from the list. Master list names are already Sainsbury's product names, which helps. Spike only. |

## Parked

- **Embedding match quality** (OpenAI `text-embedding-3-small`, thresholds 0.90 / 0.65). Known to work poorly; revisit after Phase 1, possibly with the recipe book's cleaner ingredient data.
- Existing P1 bug "URL extraction returning wrong recipe" — superseded by the S05 importer; close it when S05 lands.

## Open questions (answer when the relevant session starts)

- Is historic Sainsbury's receipt data already in prod `PurchaseHistory`? (`npm run import:receipts` exists.) — S14
- Sunday auto-draft of the meal plan: on or off by default? — S12
- Email forwarding vs Gmail pull for receipts — S17
