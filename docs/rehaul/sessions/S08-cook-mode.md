# S08: Cook mode

Wave 1 · Schema: no · Depends on: Phase 1 (recipe book, step tokens) · Branch: `rehaul_S08_cook_mode`

Read `docs/rehaul/sessions/_common.md` first.

## Goal
The Claude.ai "cook now" experience inside the app: open a recipe, tap **Cook**, and follow it step by step on a phone propped on the counter.

## Scope
1. **A cook screen** for a recipe (wire up the disabled **Cook** button on the recipe page). Big readable text, and it works one-handed on a phone.
2. **Steps:** move forward and back through the method, with the current step obvious. Ingredient references in a step show their amounts inline (the step-token helpers from S03).
3. **Servings:** a control to change servings that rescales every amount, in the ingredient list and inline in the steps. When an amount has no number (free-text quantity), show it unscaled and don't guess.
4. **Timers:** steps with a timer get a start/pause/reset button. Several timers can run at once. An alert sounds, and the phone vibrates where supported, when a timer finishes, even if you've moved on to another step.
5. **Keep the screen awake** while cooking, where the browser supports it.
6. **No method:** show the ingredients, plus a quiet note that there's no method yet. Leave a clearly marked place for S09's "tell me as you go". Quick recipes get a simple one-screen view.

## Out of scope
Capturing a method (S09). Any AI.

## Done when
Beef Keema (once it has steps) can be cooked end to end at 2 and at 6 servings, with two timers running at once, at phone width and desktop width (Playwright). Tests cover scaling, timers and step navigation.

## Focus for "How it works" in your log
How scaling flows from the servings control into the step text, and how timers keep running when you change step.
