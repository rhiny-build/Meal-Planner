# Run: UX refresh (new look, fewer taps)

Read `docs/rehaul/sessions/_common.md` first. Work unsupervised, use the `claude.md` message format, and follow "Real Claude spend". This run should need almost no real Claude calls.

## Why
Ronen says the app "feels tired, like a uni project". He wants it to help him with fewer taps, fewer copy-pastes and less text. He approved three phone mockups as the direction. They're in `docs/rehaul/mockups/` (Design Component HTML: read the markup and inline styles as the spec. They aren't app code to copy).

## Branch
Work on **`rehaul_phase3_ux`** (it exists; check it out). Use subagents if useful, but merge their work into this branch yourself. Push this branch only after meaningful milestones (each push builds a preview). Open **one PR to `main`** at the end, and don't merge it. Before every push, check the branch's PR isn't already merged (`claude.md`).

## Scope
1. **One visual style across the whole app,** taken from the mockups. It replaces the current look everywhere, not just on new screens.
   - Ground `#F3F5F2`, cards white, ink `#1C221F`, secondary text `#4F5A54`, primary green `#1F5C4A`, amber accent `#F2B544`.
   - Display font Bricolage Grotesque, body font Figtree (Google Fonts via `next/font`).
   - Rounded cards (14–22px), touch targets of at least 44px.
   - Define it once (Tailwind theme / CSS variables) and use it everywhere. Keep dark mode only if it's cheap; otherwise remove it, and say so in the log.
2. **A "Tonight" home page** (`Main.dc.html`). It replaces the current home page:
   - Today's dinner from the meal plan, with its sides, a **Start cooking** button (opens cook mode for the main recipe) and a **swap** button (opens the existing way of changing the day's meal).
   - Today's day note, if there is one.
   - The rest of the week as a compact list.
   - Shortcuts to the shopping list and the meal plan.
   - With no plan for today: a clear empty state with one action to plan it.
3. **Recipe page as flippable pages** (`Recipe.dc.html`): **Overview → Ingredients → Method**, as tabs with swipe between them on touch.
   - Ingredients has the servings control (reuse cook mode's scaling).
   - Method follows the mockup's one-step-at-a-time view with timers. **Reuse cook mode.** Don't build a second step player; the Method page can be cook mode embedded.
   - Recipes with no method: the Method page shows cook mode's existing no-method view (including "tell me as you go").
   - Edit stays reachable from the recipe page.
4. **Recipe list cards** become short: name, kind, time, and whether it has a method. No ingredient lists on cards. Tapping a card opens the recipe page. Each card also gets a **Cook** shortcut.
5. **Meal plan page** restyled as the week list in `Week.dc.html`: one row per day. Each row shows **dinner (the protein slot) with its sides (carb, veg) underneath, and lunch as a small second line**. All 4 slots must stay editable, as today, and nothing the current grid can do may be lost. Add a swap button per day.
   - **Don't build** the "Drafted from your notes / Accept all" banner, the per-day reasons, or the "Ask" box. Those are Phase 3 agent features. Leave the existing AI fill working, restyled.
6. **Navigation:** a bottom tab bar on phones (Tonight, Recipes, Week, Shopping), and an equivalent on desktop. Agent Runs and Admin move under Settings.
7. **Shopping list:** restyle only. Ronen explicitly said not to change how it works.

## Out of scope
- New agents or AI features.
- Shopping list behaviour.
- Database changes. (If one seems truly needed, stop and ask.)

## Done when
- Every page uses the new style. There's nothing left in the old look.
- At phone width (390px) and desktop width (Playwright): Tonight shows today's dinner, Start cooking opens cook mode, the recipe pages flip, servings rescale, and swap works.
- Existing tests are updated, and new ones cover the Tonight logic (picking today's meal, the empty state).

## Finish
- Log: `docs/rehaul/logs/RUN-ux-refresh.md`, including **before/after screenshots** of each main page at phone width, saved under `docs/rehaul/logs/ux-screens/`.
- PR to `main`. Message Ronen: what to try on the preview, at phone width.
