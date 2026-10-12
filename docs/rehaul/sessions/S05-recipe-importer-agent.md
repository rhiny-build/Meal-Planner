# S05 — Recipe importer agent (hand-rolled loop) and agent runs page

Wave 3 · Schema: no · Depends on: S01, S03 · Can run alongside: S04, S06

Read `docs/rehaul/sessions/_common.md` and the S01 and S03 logs first.

## Goal
The first real agent in the app, and the one Ronen learns the pattern from. Given a URL **or** a free-text description ("my schnitzel: chicken breast, flatten, egg, breadcrumbs, fry 4 min a side"), it produces a structured recipe for review, and Ronen saves it. Every run is visible on `/agent-runs`.

## This session is about readability (D7)
Write the tool loop by hand. Do **not** use the SDK's tool runner or any agent framework. Ronen will read `lib/agents/loop.ts` top to bottom, so it should be short, linear and commented. It should be obvious where the model is called, where tools run, and when the loop stops: a max-iterations guard, a stop reason, and a final structured answer.

## Design (decide yourself; record it in your log)
- `lib/agents/runLog.ts`: start a run, record steps, finish or fail it (AgentRun/AgentStep from S03). The loop calls it for every model turn, tool call and tool result.
- `lib/agents/loop.ts`: a generic loop taking `{ system, tools, input, maxTurns }`, where each tool has a name, JSON schema and handler. Returns the final output plus the run id.
- `lib/agents/recipeImporter/`: prompt file plus tools:
  - `fetch_page(url)` → readable text of the page. Strip the HTML server-side; the existing `EXTRACT_HTML_MAX_LENGTH` idea applies. Check for schema.org Recipe JSON-LD first, since most recipe sites have it and it's the most reliable.
  - `find_similar_recipes(name)` → possible duplicates already in the book.
  - `submit_recipe(recipe)` → the final structured answer: name, kind, servings, ingredients (name, amount, unit, free-text quantity, notes), steps (text with `{ing:…}` tokens, optional timer), times, source URL, suggested protein/carb/veg types from `DishType`. This tool **does not save**. It ends the loop and returns the draft.
- Prompt rules: never invent a method (D3). If the page has no clear method, return no steps. Mark it `quick` only if it's genuinely a one-step item. Prefer the page's own quantities and never convert units silently.
- UI: replace the current AI import section (`components/AIImportSection.tsx` / `app/api/recipes/extract`) with "Import from URL or description" → shows the draft in the S04 editor (if S04 isn't merged yet, a minimal review view is fine; note it in your log) → Save.
- `app/agent-runs/`: list of runs (agent, trigger, status, time, tokens) → run detail showing each step in order, with tool inputs and outputs expandable. This page will be used for every agent from here on, so keep it generic.

## Out of scope
Batch backfill (S07). Cook mode. Discovery.

## Done when
- Three real imports work: one recipe URL with JSON-LD, one without (or a messy one), and one free-text family recipe. Show each run on `/agent-runs`.
- A page with no method yields a recipe with no steps, not a made-up one.
- Old `extract` route and `extractIngredientsFromURL` removed. The P1 bug "URL extraction returning wrong recipe" is noted in your log as superseded.
- Unit tests for the loop (with a mocked Claude client: stops on `submit_recipe`, respects `maxTurns`, records steps) and for each tool. Tests pass.

## Focus for "How it works" in your log
This is the most important walkthrough of the rehaul. Trace one real import step by step on `/agent-runs` alongside `loop.ts`: what the model saw, what it asked for, what the tool returned, and why it stopped. Then explain what the SDK tool runner will do for us later (S11), and which part of `loop.ts` it replaces.
