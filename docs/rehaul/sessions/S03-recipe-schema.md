# S03 — Recipe book and agent-run schema

Wave 2 · Schema: **yes** · Depends on: S01, S02 · Runs alone (other sessions in Waves 3–4 build on it)

Read `docs/rehaul/sessions/_common.md`, the repo skill `db-migrations`, and the logs for S01 and S02 first.

## Goal
One migration that sets up everything Phase 1 needs. That way S04, S05 and S06 can run in parallel without touching the schema. Existing data must stay intact, and the app must work unchanged afterwards.

## Design to propose (then wait for Ronen's go-ahead)
Start from PLAN.md, section "Recipe data model". Decide and justify:
1. **`Recipe`**: add `kind` (`full` | `quick`, default `full`), `servings Int?`, `description String?`, `totalTimeMinutes Int?`, `notes String?`. Existing `prepTime` (quick/medium/long) and `tier` stay. Keep `recipeUrl` as it is. No renames: database changes only add (PLAN.md, "Promotion to main").
2. **`RecipeStep`** (new): `recipeId`, `order`, `text`, `timerSeconds Int?`. Method is optional (D3): a recipe with zero steps is normal.
3. **Inline ingredient references in step text**, so cook mode can show scaled amounts. Propose a token format (e.g. `{ing:<ingredientId>}`) plus one helper to render it and one to validate it. Unknown or deleted ids must render as plain text, never crash.
4. **`Ingredient`**: add `amount Float?` and keep `quantity`/`unit` as the free-text fallback. Write a pure function that parses existing `quantity` strings ("1 1/2 pounds", "1/4 cup", "500g") into amount + unit where it's unambiguous, and leaves them null otherwise. Backfill `amount` with it in this migration's data step, or a script. Report how many parsed.
5. **`AgentRun`** (new): `id`, `agent` (string), `trigger` (`manual` | `batch` | `schedule` | `mcp`), `input Json`, `status` (`running` | `succeeded` | `failed`), `output Json?`, `error String?`, `startedAt`, `finishedAt?`, token usage totals.
6. **`AgentStep`** (new): `runId`, `order`, `kind` (`model` | `tool_call` | `tool_result`), `toolName?`, `payload Json`, `createdAt`, token usage (for `model` steps).
7. Legacy `Recipe.ingredients` text column: leave it alone in this session.

## Scope
Schema plus migration, the quantity parser with unit tests, the step-token helpers with unit tests, and Prisma type updates so the existing code compiles. No UI. No agent code.

## Done when
`prisma migrate dev` applies cleanly. The app runs as before. All 78 existing recipes have `kind = full`. The parse report is in your log. Tests pass.

## Walkthrough focus
The data model as a diagram (ASCII is fine), why steps reference ingredients by id, and what the agent-run tables will hold for one example run.
