# RUN: UX refresh (new look, fewer taps)

Branch `rehaul_phase3_ux`. Real Claude calls: **none** (0 of the 150,000-token budget). Nothing in this run needed Claude's judgement, so no fixtures were recorded either.

## Built
- **One look everywhere.** Ground `#F3F5F2`, white cards, ink `#1C221F`, green `#1F5C4A`, amber `#F2B544`, Bricolage Grotesque for headings and Figtree for text (both through `next/font`). Cards are 14–22px round and every button, tab, input and select is at least 44px tall. Every page was moved over, including shopping list, settings, agent runs and the admin page.
- **Tonight** is the new home page. It shows today's dinner with its sides and time, a **Start cooking** button (cook mode for the main recipe) and a **swap** button. Today's note shows as a chip. The rest of the week is a compact list, with shortcuts to Shopping list and Meal plan. With nothing planned there is an empty state with one button, "Plan tonight".
- **Recipe page = three flippable pages**: Overview, Ingredients, Method. They flip with the tabs, with a swipe, or with the big button at the bottom. Ingredients has the servings control, and the amounts rescale. Method is cook mode embedded (one step at a time, timers, "Back / Next"). A recipe with no method gets cook mode's normal no-method view, including "Tell me as you go". Edit is in the page header. "Full screen" on the Method page opens the old full-screen cook mode.
- **Recipe cards are short**: name, Quick/Full, time and "Method · 5 steps" or "No method". Tap the card for the recipe page; **Cook** goes straight to cook mode. Edit and Delete are under a "…" menu. Filters are tucked behind one "Filters" line.
- **Week page** is one row per day: dinner (protein) with the sides (carb, veg) under it, lunch as a small second line, then the day's note, and a swap button. The swap button opens the existing way of changing a day (a dropdown for each of the four slots, plus the day's note) as a sheet. Nothing the old grid could do is lost: tapping a day opens its recipes and ingredients (the old expandable drawer), the sheet can **swap a slot, or the whole dinner, with another day** (the old drag-to-swap), the "10 of 21 meals planned" count is back, and AI fill, Clear all, previous/next week and Save plan all still work ("Save plan" still has to be pressed, as before).
- **Navigation**: bottom tab bar on phones (Tonight, Recipes, Week, Shopping) and a top bar on desktop. Agent runs and Recipe backfill moved under **Settings** ("Behind the scenes"). On phones, Settings is the gear in the top-right of each page.
- **Shopping list**: restyled only, behaviour untouched.

## Decisions
- **Dark mode removed**, not kept. The old dark theme was per-component `dark:` classes (about 475 of them) on a different palette. Keeping it would have meant designing a second palette that nobody asked for. The theme toggle and `ThemeProvider` are gone.
- **Colours live in one place**: CSS variables in `app/globals.css`, exposed as Tailwind colours in `tailwind.config.ts` (`ground`, `surface`, `ink`, `primary`, `accent`, `danger` and so on). I moved the old `blue-*/gray-*/green-*` classes over mechanically and then fixed the screens by hand.
- **Drag-and-drop between days became "Swap with another day"** in each day's sheet (pick a slot or "Whole dinner", pick a day, tap Swap). It works on a phone as well as on desktop, which dragging did not, and it uses the same swap logic as before (swapping with an empty day moves the recipe). Dragging itself is gone, and so are the three packages only it used (`@dnd-kit/*`, the two Radix ones). If you'd rather drag rows on desktop, say so and I'll add it on top.
- **Tonight's swap button goes to the week page with that day's sheet open** (`/meal-plan?day=Tuesday`) rather than building a second editor. "Plan tonight" in the empty state does the same, and tapping a day in "Rest of the week" opens the week page for that day.
- **Which dish is "dinner"**: the protein slot is the main. With no protein, the carb slot (a pasta dish) or the vegetable slot stands in. The other filled slots are the sides. Lunch is not part of dinner.
- **"Today" is the viewer's day**, worked out in the browser (not on the server), so a server in another time zone can't show yesterday's dinner. Days are matched by weekday name, as the meal plan already does.
- **No "Drafted from your notes / Accept all", no per-day reasons, no "Ask" box**, as instructed. The second shortcut on Tonight is "Meal plan" instead of the mockup's "Draft next week" (that is the Phase 3 agent feature).
- **Swipe**: on Overview and Ingredients a swipe flips the page. On Method a swipe moves between steps (a swipe there is not also a page flip). The Method page stays mounted once opened, so running timers and the current step survive flipping to Ingredients and back. The screen wake lock is only held while Method is showing.
- **Servings are shared**: the number set on the Ingredients page also scales the steps on the Method page.
- **Shopping list tab labels got slightly smaller type** so all four tabs fit at 390px. Labels are unchanged.
- No database changes. No new runtime dependencies.

## How it works
**Design first.** The look is a handful of CSS variables; Tailwind reads them, so a page just says `bg-surface text-ink` and `bg-primary`. Navigation is two small components fed by one list (`components/navItems.ts`): `TabBar` (phones) and `Header` (desktop, from `md` up). `PageHeader` is the shared title block (small line, big title, gear on phones).

**Tonight** (`lib/tonight.ts`, `lib/hooks/useTonight.ts`, `components/tonight/`):
1. `useTonight` works out the viewer's today, asks `/api/meal-plan` for the week containing it (the same call the week page makes) and reads the week's day notes.
2. `lib/tonight.ts` is pure logic with no React: `findPlanForDay` picks today's row by weekday name, `getDinner` splits it into main and sides, `getRestOfWeek` lists the later days.
3. `TonightClient` shows a loading block, an error, the dinner card, or the empty state.

**Recipe pages** (`app/recipes/[id]/RecipePages.tsx`): holds which page is showing and the servings. The panels are always in the page (just hidden) so state isn't lost. The Method panel renders `CookScreen` with `isEmbedded`, so there is only one step player in the app. `CookScreen` now takes `isEmbedded`, `servings`/`onServingsChange` (so the page owns them) and `isActive`. `useSwipe` (`lib/cook/useSwipe.ts`) turns a mostly-horizontal drag of 50px or more into left/right.

**Week page** (`app/meal-plan/components/`): `WeekList` → `WeekDayRow` per day (tap to open `WeekDayDetails`, the old ingredients drawer), and `DaySwapSheet` holds the existing searchable dropdowns and the swap-with-another-day controls. It calls the same `onRecipeChange` / `onNoteChange` handlers as the old grid, so saving works exactly as before.

## Try on the preview
At phone width:
1. Open the home page. You should see **Tonight** with today's dinner in the green card. Tap **Start cooking**: cook mode opens on step 1 of that recipe (it will say there is no method yet if the recipe has none).
2. Back on Tonight, tap the **swap arrows**. The week page opens with that day's sheet. Change the protein, tap **Done**, then **Save plan**, then Tonight again. The dinner has changed. On the week page, tap a day's name to see its ingredients, and try "Swap with another day" in the sheet.
3. Open **Recipes**, tap a card. Flip **Overview → Ingredients** (swipe, tab or big button). On Ingredients, tap **+** twice: the amounts go up. Tap **Start cooking** for the Method page: one step at a time, with a timer where the step has one.
4. On **Recipes**, tap **Cook** on any card, and the "…" on a card for Edit and Delete.
5. Open **Settings** (gear, top right): **Agent runs** and **Recipe backfill** are at the bottom. Check **Shopping** works as before.

## Checks run
- `npm test`: 670 passed. New: `lib/tonight.test.ts`, `lib/hooks/useTonight.test.ts`, `components/tonight/TonightClient.test.tsx` (today's meal, no meal, sides, note, empty state, error), `app/meal-plan/components/WeekList.test.tsx` (rows, lunch line, ingredients, swap sheet, swap with another day), `app/meal-plan/helpers/weekLabels.test.ts`, `app/recipes/[id]/RecipePages.test.tsx` (tabs, swipe, servings rescale, embedded steps, no-method view), `components/TabBar.test.tsx`. Updated: `components/RecipeCard.test.tsx`, `components/recipe/recipeBook.test.tsx`. Removed: the old drawer test (its behaviour is covered in `WeekList.test.tsx`). The swap helper and its tests are kept (now used by "Swap with another day").
- `npx tsc --noEmit` and `next build` pass. The repo has no ESLint config, so lint was not run.
- Playwright (`scripts/ux-check/check-ux.cjs`, run by hand against the local app and a local Postgres): 23 checks at 390px with touch (including a real swipe) and 21 at 1280px, all passed: Tonight shows today's dinner and note, Start cooking opens cook mode, the recipe pages flip, servings rescale, the Method page steps, the swap changes tonight's dinner (then restored), the week list opens a day's ingredients and swaps a day with another, the navigation is right. I also ran the empty state in the browser (cleared today's protein, saw "Nothing planned for tonight", "Plan tonight" opened the sheet, restored it).
- Screenshots: `docs/rehaul/logs/ux-screens/before/` (old look) and `after/` (phone, 390px), plus `desktop/`. The "after" set also has Ingredients, Method with a running timer, the swap sheet, the Tonight empty state and Agent runs. The "before" shopping screenshot is the empty list; "after" has a sample list.

## Handoff
- Use the theme tokens (`bg-surface`, `text-ink`, `text-ink-soft`, `bg-primary`, `bg-accent`, `rounded-card`, `rounded-panel`) for new UI. Don't add raw `gray-*`/`blue-*` colours or `dark:` classes.
- `PageHeader` is the title block for main pages; add an `eyebrow` and `trailing` slot content as needed.
- The week page's "Ask" box and "Drafted from your notes" banner (Phase 3 agents) should go in `WeekList`'s page (`MealPlanClient`) above the list; per-day reasons can go in the second line of `WeekDayRow`.
- `getDinner` in `lib/tonight.ts` is the one definition of "main and sides"; reuse it.
- `/meal-plan?day=<Weekday>` opens that day's sheet.
- Tests that start a local Postgres (`tests/integration`) were not run here; nothing in this run touches the database layer.

## Proposed doc updates
- **ARCHITECTURE.md**: add `components/tonight/`, `components/TabBar.tsx`, `components/Header.tsx` (desktop only), `components/PageHeader.tsx`, `components/navItems.ts`; the meal-plan folder is now `WeekList`/`WeekDayRow`/`WeekDayDetails`/`DaySwapSheet`/`WeekToolbar` (the grid, drag-and-drop and separate mobile view are gone); recipe page is `RecipePages` with embedded cook mode; theme tokens in `app/globals.css` + `tailwind.config.ts`; no dark mode.
- **FEATURES.md**: Tonight page, recipe pages, short recipe cards, week list with swap sheet, bottom tab bar. Replace: drag-and-drop between days with "Swap with another day" in the day sheet. Remove: dark mode, ingredient lists on recipe cards.
- **BACKLOG.md**: optional drag-to-reorder on the week list (desktop); the week-page "Ask" box and drafted-plan banner (Phase 3); Tonight shortcut "Draft next week" (Phase 3).
