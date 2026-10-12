# Orchestrator log: Phase 0 + 1

## Environment decisions
- The cloud environment exposes the dev key as `DEV_ANTHROPIC_API_KEY` (instead of `ANTHROPIC_API_KEY`). Sessions map it to `ANTHROPIC_API_KEY` for single processes only; app code and `.env.example` keep the standard name. The key is never written to disk or committed.
- Local Postgres 16; one database per session (`mp_s01`, `mp_s02`, ...), `mp_phase` for the merged phase branch, `mealplanner_test` for integration tests.

## Merges
- **S02** merged (unit 268, integration 66 pass). Checked in the running app: a day note typed on /meal-plan survives a reload and lands in `DayNote`.
- **S01** merged on top (unit 271, integration 66 pass, no `chat.completions` left). Checked in the running app: `POST /api/recipes/discover` returns real recipes via Claude web search.
- No merge conflicts between S01 and S02.

## Notes
- `claude-sonnet-5-5` rejects forced `tool_choice`; S01 uses `tool_choice: auto` with one tool and throws if no tool call comes back. Later agent sessions (S05) must follow the same approach.
- URL import was only run against a local fixture (external recipe sites return 403 from the sandbox). Worth a quick check on the preview.
- **S03** merged (unit 316, integration pass). Local run: migration applied, all recipes `kind=full`, 95 ingredients backfilled (48/48 with a quantity parsed), `/recipes` and `/meal-plan` load. The amount backfill is part of `npm run build`, so it runs on the first production deploy (additive, idempotent).
- **S06** merged (unit 340, integration pass). Handlers were also driven over HTTP by a real MCP client in the session. **Open security point for Ronen:** `/api/mcp` has no authentication (true before S06); `update_recipe` lets anyone with the URL overwrite recipes. Not fixed here (out of scope, a choice for Ronen).
- **S04 UX decision (made without asking, to avoid blocking):** recipe editing stays in a modal like today; the editor is a self-contained component so it can move to the page. Question for Ronen: modal or page?
