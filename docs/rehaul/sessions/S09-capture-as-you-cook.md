# S09: Capture as you cook

Wave 2 · Schema: no (ask the orchestrator if you think you need one) · Depends on: S08 · Branch: `rehaul_S09_capture`

Read `docs/rehaul/sessions/_common.md` first.

## Goal
For a recipe with no method (e.g. the family recipes), cook mode **offers** "tell me as you go". Ronen types or dictates short notes while cooking. At the end, Claude turns them into proper steps, and he reviews them before anything is saved. It's optional, and never a nag (decision D3/D5 in PLAN.md).

## Scope
1. In cook mode, for a recipe with no steps: an optional "Tell me as you go" button. Notes are captured one at a time (a text box; the phone keyboard's own dictation is enough, so no custom speech feature). Each note gets a timestamp, so durations can be inferred ("simmered about 10 minutes").
2. **Finish:** one Claude call structures the notes into steps. It references the recipe's ingredients with step tokens, adds timers only where the notes support them, and **never invents** steps, quantities or times. Use the cheaper model unless your 5-case sample shows it isn't good enough; record the comparison in your log.
3. **Review screen:** edit, reorder or delete the steps, then **Save**, or discard. Saving uses the existing recipe write path. Recipes that already have steps are never overwritten.
4. Record the run on Agent Runs (trigger `manual`).
5. Notes shouldn't be lost on an accidental reload mid-cook. Keep them on the device until saved or discarded.

## Done when
Starting from a recipe with no method: capture 5 notes, finish, review, save, and the recipe page shows the steps. Discarding leaves the recipe unchanged. Replayed-response tests for the structuring step, plus at most 5 real-Claude cases.
