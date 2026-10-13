# S10: In-app discovery chat

Wave 1 · Schema: no · Depends on: Phase 1 (importer agent, Agent Runs) · Branch: `rehaul_S10_discovery`

Read `docs/rehaul/sessions/_common.md` first.

## Goal
Discovery phase B (decision D4): a chat in the app to find recipes conversationally ("something with chicken thighs, quick, kids will eat it"), see a few options, refine them, and save one straight to the book with its method.

## Scope
1. **A chat UI** with streamed replies. The conversation lives only in the page. No new database tables.
2. **An agent with tools:**
   - Claude's web search (server tool), capped at a few searches per message.
   - `search_my_book`: what's already in the book, to avoid duplicates and to suggest using existing recipes.
   - `import_recipe(url)`: reuses the existing importer agent, and shows its draft for review.
   Saving always goes through the existing review screen. Nothing saves without Ronen confirming.
3. **Show progress:** what the agent is doing ("searching…", "reading the page…"), with a rough time estimate, as in the Phase 1 fixes.
4. Record runs on Agent Runs.
5. **Model and cost:** choose a model per step and justify it in your log with your 5-case sample. Cost per discovery conversation must be stated in the log.

## Out of scope
Meal planning from chat (Phase 3). Saving chat history.

## Done when
A conversation that searches, shows 3 options, refines once, imports one, reviews it and saves it to the book. Tested at phone width. Replayed-response tests for the agent, plus at most 5 real-Claude conversations.
