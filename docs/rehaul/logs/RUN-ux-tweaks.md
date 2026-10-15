# Run log: UX tweaks (Week page, app on the home screen, cook mode resume, latency)

Branch `rehaul_phase_ux2`, from `main` after the clean-up PR merged. No real Claude calls (the Ask box and Draft my week were tried against the scripted stand-in, `scripts/meal-plan/mock-anthropic.cjs`). Real Claude spend: 0 tokens.

## Built
- **Week page:** tap a day (or its pencil) and the day's editor opens. An empty day says **Plan this day**. Every row has a **note** line ("Add note"); typing saves in place, no panel. The ⇄ icon is gone; swapping days is inside the editor, under "Swap with another day". When next week has days without a dinner, a line under the buttons says "Add notes first, Draft my week uses them". Ask box, Draft my week, Accept all, Save plan, Clear all, day ingredients (now an "Ingredients" link in the row) and swap-with-another-day all still work.
- **Installable app:** web app manifest (name "Family Meal Planner", short name "Meals", standalone, start at `/`, the app's colours), iPhone tags (`apple-mobile-web-app-capable`, title, status bar), a new icon (green ground, cream plate with an amber centre) in 192, 512, maskable 512 and 180 (iPhone).
- **Cook mode resumes:** step, servings and timers (by end time) are saved as they change. Reopening that recipe's cook mode resumes there; Tonight shows **Resume cooking**. Close / Finish / Done clears it; so does 12 hours without a change.
- **Timings:** every page, API route and the main server actions are measured (time, database time, query count, cold start); the browser reports first byte and time until usable. New admin page **/admin/timings** (Settings > Behind the scenes > Timings): per page the median and slowest 10% over 7 days. Rows over 30 days are deleted.
- **Latency fixes** (numbers below).

## Decisions
- **Tapping the day opens the editor; ingredients moved to an "Ingredients" link** in the row (only for days with a dinner). Before, tapping the day showed ingredients. The brief said tapping a day opens the editor, so ingredients needed another home.
- **Hint rule:** "empty" means no protein, carb or vegetable (lunch doesn't count), the same days Draft my week fills. It looks at *next week* (what Draft my week drafts), fetched after the page has loaded so it never competes with it.
- **Cook session:** one session at a time (a new recipe replaces the old). Full-screen cook mode counts from the moment it opens; the one inside the recipe page's Method tab only counts after you move on or start a timer, so merely looking at a recipe never shows Resume cooking. Expiry is 12 hours after the **last change**, not after the start. A timer that ended while away finishes and alerts when you return.
- **Manifest by Next's own file convention** (`app/manifest.ts`, `app/icon.png`, `app/apple-icon.png`, `metadata.appleWebApp`). `nextjs.org` was not reachable from the build session, so I read the typings in `node_modules/next` instead. Next writes the newer `mobile-web-app-capable` tag; I also added the older `apple-mobile-web-app-capable`, because older iPhones only read that one.
- **Icons are made by a script** (`scripts/make-app-icons.cjs`, uses `sharp`, already installed with Next) so they can be redrawn; the PNGs are committed.
- **Measuring:** Prisma's `$use` hook counts each query per request (AsyncLocalStorage), wrappers `measured()` around pages, API routes and actions record after the response is sent (`after()`), so recording never delays a page. A measured call inside another is part of the outer one (one record). Nothing is recorded in tests or during `next build`. Browser reports go by `sendBeacon`. No external monitoring service.
- **Pages that load data in the browser** (Tonight, Week, Recipes) say "ready" when the real content is on screen (`usePageReady`), so "usable" isn't the Loading placeholder.
- Pages that Next prerenders (`/meal-plan`, `/recipes`) have no server time of their own; their server cost is the API calls they make, which are measured.
- `database` time on the admin page is the sum of query times, so it can exceed the total when queries run side by side (that is the point of running them together). The query count is operations, not database round trips (Prisma `include` adds some).
- Updated older Playwright scripts for the renamed button/test ids (`Change Monday` -> `Edit Monday`). Made the model stand-in answer politely when a search finds nothing instead of crashing.

## How it works
**Week row.** `WeekDayRow` is one big button (opens the editor, `DayEditSheet`) plus a real text input for the note, wired to the same `handleNoteChange` the editor used, which already saved to the database a moment after you stop typing. Nothing about saving changed.

**Cook session.** `lib/cook/cookSession.ts` holds the rules as plain functions that take "now" (parse, expire, which recipe, when to save), plus a small never-throwing storage layer. `useCookSession` restores once after the first render, then saves on every change; `CookScreen` calls `endSession` from its leave buttons. Timers store the time they end, so a reload doesn't lose them.

**Timing.** `measured(kind, route, fn)` in `lib/timing/measure.ts`:
```ts
return await runWithStats(stats, () => fn(...args))   // queries add themselves to `stats`
... finally { queueSave({ route, totalMs, dbMs, queryCount, coldStart }) }  // after the response
```
`coldStart` is "first request this function instance handled". `lib/timing/summary.ts` turns rows into median and slowest 10%. `components/TimingReporter.tsx` reports browser timings.

**iPhone storage and the "tell me as you go" drafts.** The home-screen app and Safari keep **separate** storage on iPhone. So the cook session *and* the capture notes/drafts (also browser storage) written in one are invisible in the other: start cooking in a Safari tab, then open the home-screen app, and neither "Resume cooking" nor your notes appear. Pick one (the home-screen app, once added) and use it. Notes already written in Safari stay in Safari. If that bites, the fix is to store the session and drafts in the database instead (needs a "who am I" idea first, as the app has no login).

## Latency table
Production mode (`next build && next start`), local Postgres with 78 recipes (8 ingredients, 6 steps each) and two planned weeks, 12 loads per page, phone width. **Before** = the timing build with none of the fixes; **after** = this branch. Local database has no network gap, so only the *shape* shows; on Neon every extra round trip costs real time.

| Request (server) | Before: median / slowest 10% | After: median / slowest 10% | What changed |
|---|---|---|---|
| GET /api/meal-plan | 21 / 42 ms | 12 / 29 ms | one read instead of check-then-read, trimmed meals (13 KB to 4.8 KB), carries day notes |
| action getDayNotesForWeek (Tonight) | 49 calls | 24 calls | Tonight no longer makes this second call; one request per Tonight view |
| GET /api/recipes (Week page) | 35 / 46 ms, 263 KB | 30 / 43 ms, 167 KB | Week page leaves out the method (`?steps=none`) |
| Page /recipes/:id | 16 / 20 ms | 8 / 15 ms | recipe and dish types asked together (3 round trips to 2) |
| Page /settings | 16 / 25 ms | 7 / 20 ms | settings, dish types, week start together |
| Page /shopping-list | 24 / 44 ms | 19 / 47 ms | settings together; Next week list: plan read with the receipts, tick clean-up with the tick read (4 round trips to 2) |
| Page / (Tonight) | 6 / 17 ms | 5 / 14 ms | unchanged (already one query) |

Browser, full load (time until the real content is on screen, from my timing reports): Tonight 91 to 90 ms, Week 67 to 70, Recipes 53 to 55, Recipe page 86 to 87, Shopping 59 to 63, Settings 80 to 86. **No visible change locally:** with the database on the same machine the saved round trips are worth about a millisecond each. What the fixes buy shows on the preview, where each round trip crosses to Neon and each extra function request can hit a cold start. Of the fixes, the one that matters most there is Tonight: two requests became one.

Still the slowest, and not fixed here (needs a design change, not a tweak): the **Week page makes four requests on load** (recipes, plan, draft, notes) after the page itself, each its own serverless call; and the Week and Tonight screens fetch their data after hydration rather than with the page. A single "week" request, or loading the plan on the server, would cut it further; I left it because it reshapes how those screens load and save.

## Try on the preview
1. **Add to home screen** (Safari: Share, Add to Home Screen). It should open full screen with the green plate icon, no address bar.
2. **Week:** tap "Plan this day" on an empty day in next week, pick a protein, Done, then type a note in the row and Save plan. Nothing should look like "swap". "Add notes first..." shows under Draft my week while next week has empty days.
3. **Cook:** Start cooking, go to Next, start a timer, switch to another app, come back: same step, timer still running. On Tonight a "Resume cooking" card shows; Close clears it. (Use the same place, Safari tab or home-screen app, each time: see the storage note.)
4. **Timings page** (Settings > Timings) after a day of use. Look at: *Cold starts* per server row (first request after the function woke), *Database* vs *Median* (a big share means the Vercel-to-Neon gap or the database waking), *Queries* (many queries x the gap), and "In the browser" **opening the app** vs **tapping to this page**.
5. Can't be proved locally: cold starts, Neon waking up, the Vercel to Neon region gap, real iPhone standalone behaviour (headless Chromium can't switch to standalone display mode; the walk through the app used only its own buttons and links, and a recipe website link opened in its own tab).

## Handoff
- New table `RequestTiming` (additive migration `20261015113811_add_request_timing`); Neon backup branch before merging as usual. Rows older than 30 days are deleted opportunistically (at most hourly per instance, and when the Timings page opens).
- `TIMING_ENABLED=false` switches recording off.
- To measure a new route, wrap it: `export const GET = measured('api', 'GET /api/x', handler)`. Browser pages that load data themselves should call `usePageReady(!isLoading)`.
- Checks: `scripts/ux-check/check-ux-tweaks.cjs` (run per width with `ONLY=phone|desktop`, reseed between), `scripts/timing-check/measure-pages.cjs` and `summary.sql` for before/after. The older `check-ux.cjs` has 4 failures (today's note, two swipes) that also fail on `main` with this local data; they are data/environment, not from this run.
- Unit tests: 764 pass; integration: 100 pass.

## Proposed doc updates
- **ARCHITECTURE.md:** add `RequestTiming` to the data model; add "Measuring" (measured wrapper, Prisma hook, browser reporter, admin page) to the flows; note the cook session lives in browser storage.
- **FEATURES.md:** Week page editing and notes in the row; add to home screen; Resume cooking; Timings page.
- **BACKLOG.md:** one "week" request for the Week page (or server-loaded plan); store cook session and capture drafts in the database if iPhone storage splitting causes trouble; `npm run lint` is still broken.
- **Vercel's built-in tools (for Ronen to decide, infrastructure):** Vercel's **Speed Insights** (real-user page timings) and the project's **Observability / runtime logs** (function duration and cold starts) cover the same ground. I built the in-app page because it shows per-page database time and query counts, which Vercel's tools don't, and it needs no new service or script on every page. If you'd rather use Vercel's, the in-app timing can be switched off with `TIMING_ENABLED=false` and removed later. I couldn't read Vercel's docs from the build session, so check current plan limits and what is included before relying on them.
