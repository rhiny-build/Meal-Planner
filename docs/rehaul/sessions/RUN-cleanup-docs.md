# Run: clean-up and docs (with architecture diagrams)

Read `docs/rehaul/sessions/_common.md` and `docs/rehaul/PLAN.md` first. Work unsupervised and use the `claude.md` message format. This run should need no real Claude calls.

## Why
After Phases 0–4 the repo carries a lot from before the rehaul: old docs, old plans, an unused prototype folder and dead code. Ronen wants it tidy and, above all, wants **up-to-date architecture and design diagrams** he can read to understand the system as it is now.

## Branch
**`rehaul_phase_cleanup`**, created from the latest `main` (it deploys a preview). Push after meaningful milestones only. One PR to `main` at the end; don't merge it. Before every push, check the branch's PR isn't already merged (`claude.md`).

## Scope
1. **Old shopping list: keep it, hide it.**
   - It stays fully working, unchanged, together with everything behind it (master items, categories, ingredient mappings, embeddings, OpenAI).
   - Add a switch in Settings, "Show old shopping list", **off by default**, stored in the database (`SystemSetting` exists). Off: the Shopping tab shows only Next week, and the old list's Settings tabs (master lists, categories) are hidden. On: everything as today.
   - Removing the old list is a later decision for Ronen. Don't remove anything it uses.
2. **Diagrams.** Mermaid, in the repo, so GitHub draws them. Each must match the code as it is; build them by reading the code, not from older docs. One short paragraph under each saying what to look at.
   - **System overview:** browser, Next.js app on Vercel, Neon Postgres, Vercel Blob, Claude API, OpenAI embeddings, the MCP endpoint and Claude.ai.
   - **Data model:** the main tables and their links, grouped (recipes, meal plan and day notes, receipts and purchase history, old shopping list, agent runs). Leave out columns that don't help understanding.
   - **Agents:** each agent (importer, backfill, method capture, meal-plan agent), what triggers it, its tools, the model it uses, and where its runs are recorded. Show the hand-rolled loop against the SDK tool runner.
   - **Receipts to Next week:** upload, Blob, parsing, product to item, prediction, meal ingredients, Copy for Sainsbury's.
   - **Planning flows:** Ask box, Draft my week then Accept, and Claude.ai through the connector.
   - **Environments and deploys:** local session, branch preview with its Neon branch, production, and the deploy allow-list.
   These go in `ARCHITECTURE.md`, rewritten from scratch as the single architecture doc.
3. **Docs.** Read every doc outside `docs/rehaul/`: top level, `docs/` and `docs/Archive`, `docs/Specs` and `docs/Code Reviews`. For each one, either:
   - **delete** it (superseded or wrong);
   - **merge** what's still true into a current doc;
   - **move** it to `docs/Archive` (history worth keeping).
   One backlog, not two: merge `BACKLOG.md` and `docs/backlog.md`, dropping what's done. Keep `README.md` short and current: what the app does, how to run it, links to `ARCHITECTURE.md` and `docs/rehaul/`.
4. **Claude Code instructions.** Check `claude.md` and every skill in `.claude/skills/` against how work is done now (`_common.md`, PR flow, allow-list). Fix what's wrong. Flag anything that would push to production directly (e.g. `push-to-prod`), and **don't delete a skill**: list it under "Proposed doc updates" for Ronen to decide.
5. **Dead code.**
   - Delete `restock-agent/`, after checking nothing in the app imports from it.
   - Delete code nothing uses (e.g. `lib/purchase-history/purchaseMapping.ts`). Use a tool such as `knip` to find it, and check each hit by hand. Anything the old shopping list uses stays.
   - **No database changes** in this run. If you find unused tables or columns, list them in the log for Ronen.

## Out of scope
- Removing the old shopping list, master items, embeddings or OpenAI.
- UX changes other than the Settings switch.
- MCP authentication.

## Testing
- Type check, unit and integration tests pass.
- Production mode (`npm run build && npm start`): the app works with the switch off and on.
- Playwright at phone and desktop widths: with the switch off, the Shopping tab shows only Next week; with it on, the old list works as before.
- Every diagram renders. Check the Mermaid syntax with the Mermaid CLI or a renderer, and say how in the log.

## Finish
- Log: `docs/rehaul/logs/RUN-cleanup-docs.md`, with every section from `_common.md`, plus a table of every doc and file removed or moved, and what happened to it.
- PR to `main`. Message Ronen:
  - where to read the diagrams (`ARCHITECTURE.md` on the PR's branch in GitHub);
  - what to try on the preview: Settings switch off and on.
