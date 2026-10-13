# Phase run: Phase 2, cook mode (S08–S09)

You are the **orchestrator** for this phase. Read `docs/rehaul/sessions/_common.md` (especially "Work unsupervised", "Branches" and "Real Claude spend") and `docs/rehaul/PLAN.md` first. They apply to you and to every subagent you start.

## Goal
Build S08 and S09 on one phase branch, unsupervised. Finish with **one** PR from the phase branch to `main`, which Ronen tests on its Vercel preview and merges himself.

## Branches (strict)
- Phase branch: **`rehaul_phase2`**, created from `main`. Push it straight away. Only `main` and `rehaul_phase*` branches deploy on Vercel (`vercel.json`), so only this branch gets a preview.
- Session branches: **`rehaul_S08_cook_mode`**, **`rehaul_S09_capture`**, each from the phase branch. They never deploy, so test locally.
- Ignore any default branch name. If a push to these names fails, say so in your first message.

## Order
1. **S08**, then
2. **S09** (it builds on S08's cook mode). You may build S09 in a subagent once S08 is merged.

Discovery chat (the old S10) is **dropped**: Ronen discovers recipes in Claude.ai through the MCP server instead.

## Merging into the phase branch (you do this)
Merge a session's branch only when its unit and integration tests pass on the merged result, its log exists with every section from `_common.md`, and you've run the app on the merged branch and checked the feature works. Resolve conflicts yourself and record them in `docs/rehaul/logs/RUN-phase-2.md`.

Push the phase branch **only after each merge**, not after every commit, so its preview rebuilds a handful of times rather than dozens.

## Real Claude budget
- **150,000 tokens per session** and **300,000 for the whole phase**, on the dev key.
- No full batch runs.
- Report the totals in your log.

## When to involve Ronen
Only for UX choices, blockers and real trade-offs, batched together. Use the `claude.md` message format. Known UX questions to batch up front, before building:
- **S08:** what the cook screen looks like on a phone propped on the counter (one step per screen vs a scrolling list with the current step highlighted).

Offer 2–3 options for each, with a recommendation. Then build.

## Finish
1. Run docs-sync (`docs/rehaul/sessions/docs-sync.md`) on the phase branch.
2. Open **one** PR: `rehaul_phase2` → `main`, with these sections: **What changed for you**, **Try on the preview** (on a phone), **Decisions I made without asking**, **Known gaps**, **Real Claude spend**.
3. Message Ronen in the `claude.md` format: "What I need from you" is to test the preview and merge.
