# Log: RUN-cleanup-docs (clean-up and docs, with architecture diagrams)

Branch `rehaul_phase_cleanup`, from `main` at `deb3be5`. No real Claude calls were made (0 tokens of the dev-key budget), and there are no database changes.

## Built

- **Settings switch "Show old shopping list"** (Settings > Preferences, off by default, stored in `SystemSetting` as `showOldShoppingList`).
  - Off: the Shopping page is just the Next week view (no tab bar, and it no longer creates or loads the old list). In Settings the Master Lists and Categories tabs are hidden.
  - On: everything as before. The old list's code was not changed.
- **`ARCHITECTURE.md` rewritten from scratch** with six Mermaid diagrams, each with a paragraph on what to look at: system overview, data model, agents (hand-rolled loop against the SDK tool runner), receipts to Next week, planning flows (Ask, Draft then Accept, Claude.ai connector) and environments and deploys.
- **Docs tidied** to one current set (table below). One backlog, a short README, one testing doc, a new `docs/Old-Shopping-List.md`, and the MCP spec updated for the five plan tools.
- **`claude.md` and the skills** brought in line with the PR flow and the deploy allow-list.
- **Dead code removed:** `restock-agent/`, the unused `lib/purchase-history/`, and a few other unused files and functions (table below).

## Decisions

- **Branch name.** The session environment named another branch for this session; I followed the prompt (`rehaul_phase_cleanup`) as `_common.md` says. See "Push" under Handoff.
- **Off means no old-list work at all.** With the switch off the Shopping page skips `ensureShoppingListExists` and the category query, so no empty old list is created behind the scenes. A saved link such as `/shopping-list?tab=list` shows Next week.
- **Settings default tab.** With the old list hidden, Settings opens on Dish Types (the first visible tab). `?tab=master-lists` or `?tab=categories` falls back to it.
- **Switch UI:** a plain checkbox on the Preferences tab with one sentence of explanation. No other UX change.
- **Diagram format:** Mermaid fenced blocks in `ARCHITECTURE.md` only (GitHub draws them). The ER diagram leaves out most columns.
- **`FEATURES.md` archived rather than rewritten.** It was a Phase 1 checklist (with test counts, performance metrics and "not implemented" lists that are wrong now). The README's short "What it does" replaces it.
- **Old shopping list documented, not deleted.** It stays live, so I wrote a short current doc (`docs/Old-Shopping-List.md`) and archived the older design notes (they describe `baseIngredient`, which was renamed `normalisedName`).
- **`git-discipline` edited, `push-to-prod` not.** `git-discipline` told sessions to run `/push-to-prod` and merge to `main`. I changed it to "open a PR, don't merge". `push-to-prod` itself is untouched and flagged below.
- **Dead code: only what is clearly dead.** I deleted files and functions nothing imports (checked by hand, below). I did **not** delete anything under `scripts/` (developer tools, demo seeders, Playwright scripts), because whether they are still useful is Ronen's call; I listed them in BACKLOG instead.
- **Removed the `/purchase-history` page** ("Coming soon" placeholder, linked from nowhere) and its nav prefix. Nothing else linked to it.
- **Removed the unused `select` dependency** (`npm uninstall select`; nothing imports it). `eslint` / `eslint-config-next` flagged by knip stay (lint is broken for another reason, already in BACKLOG).

## How it works

**The switch.** `getShowOldShoppingList()` and `setShowOldShoppingList()` in `app/(modules)/settings/preferenceActions.ts` read and write one `SystemSetting` row (`'true'` or anything else means off). Two server pages read it:
- `shopping-list/page.tsx`: when off, it loads only the Next week data and renders the small `NextWeekOnly` component instead of `ShoppingListClient`. When on, the original path runs untouched.
- `settings/page.tsx` and `SettingsClient.tsx`: when off, the categories query is skipped and the Master Lists and Categories tabs are filtered out of the tab list.

**The diagrams** were built by reading: `prisma/schema.prisma`, `lib/ai/config.ts` (models), `lib/agents/loop.ts` and `lib/mealPlanAgent/runPlanAgent.ts` (the two loops), the API routes (triggers), `lib/receipts/*` and `lib/nextWeek/*` (receipts to Next week), `lib/mcp/*`, `vercel.json` and `.github/workflows/ci.yml` (deploys). Things I found while doing it that older docs got wrong:
- MCP plan tools have no agent in the app; Claude.ai is the agent, and those writes are not logged as agent runs. `RunTrigger` has `schedule` and `mcp` values that nothing uses.
- The importer, backfill and method capture run on **Haiku**; only the meal-plan agent (and recipe discovery) use Sonnet.
- Draft my week writes only `PlanDraft`; Accept copies it into `MealPlan` and marks the old list stale.

**Dead-code check.** `npx knip` reported 25 unused files. I deleted these after grepping for importers (none):

| Removed | Why it was safe |
|---|---|
| `restock-agent/` (27 files) | Only mentioned in a comment in `lib/receipts/parseReceipt.ts` and in `tsconfig.json`'s `exclude`; both cleaned up. The parser was already ported (S14). |
| `lib/purchase-history/` (`index`, `frequencyAnalysis`, `purchaseMapping`, `suggestions`) | Nothing imports it; the `scripts/purchase-history/*` scripts do not use it either. |
| `lib/ingredientHelpers.ts` | No importers. |
| `lib/ai/index.ts` (barrel) | No importers; everything imports `lib/ai/<file>` directly. |
| `prisma/migrateIngredients.ts` | One-off script from the structured-ingredients migration; nothing runs it. |
| `app/(modules)/purchase-history/page.tsx` | Placeholder page. |
| `generateMealPlan` in `lib/aiService.ts` | Called `/api/meal-plan/modify`, a route that no longer exists. |
| `isWeekPast` in `lib/dateUtils.ts`, `getAllDishTypes` in `lib/dishTypeConfig.ts` | No callers. |

Everything the old shopping list uses (`lib/shopping-list/*`, `lib/ai/openaiEmbeddings.ts`, `normaliseMasterItem`) was left alone.

## Testing

- Type check: clean. Unit tests: 69 files, 697 tests pass. Integration tests: 14 files, 97 tests pass (one new test for the switch: off by default, on, off again).
- **Production mode** (`npm run build && npm start`, local Postgres, port 3100), Playwright at phone (390px) and desktop (1280px) widths, run twice (before and after the dead-code removal):
  - Switch off: the Shopping page shows no tabs and the Next week view; `?tab=list` also shows Next week; Settings tabs are Dish Types and Preferences.
  - Tick "Show old shopping list": Shopping shows Next week, Meals, Staples, Restock, List; Settings shows Master Lists, Categories, Dish Types, Preferences. Untick: back to the off state.
  - Not run: generating an old list with real Claude or OpenAI (that code is unchanged; no keys were used).
- **Diagrams:** all six blocks of `ARCHITECTURE.md` were extracted and rendered with the Mermaid CLI (`@mermaid-js/mermaid-cli`, headless Chromium from `/opt/pw-browsers`); every one produced an SVG with no syntax errors, and I looked at the data model and agents renders as images. GitHub's renderer is slightly different (older Mermaid in some cases), so Ronen should glance at them on the PR branch.

## Doc and file table

| File | What happened | Why |
|---|---|---|
| `ARCHITECTURE.md` | Rewritten | Stale; now diagrams built from code |
| `README.md` | Rewritten (292 to about 60 lines) | Stale (said AI-generated plans, "Phase 2 not implemented", Next 14) |
| `BACKLOG.md` + `docs/backlog.md` | Merged into `BACKLOG.md`; `docs/backlog.md` deleted | One backlog. Done items dropped (`[x]` items and all three completed items in `docs/backlog.md`) |
| `QUICKSTART.md` | Deleted | OpenAI-only setup, wrong. Run steps now in README |
| `TESTING.md` | Deleted | Duplicate of `docs/Testing.md` |
| `docs/Testing.md` | Rewritten | Counts and file names stale; now covers CI, integration setup, Claude replay |
| `TODO-AI-MODIFY.md` | Deleted | Work-in-progress note for `modifyMealPlan`, which was replaced by the meal-plan agent |
| `cheatsheet.md` | Deleted | Generic VS Code shortcuts and Prisma basics; useful commands are in README and the `db-migrations` skill |
| `FEATURES.md` | Moved to `docs/Archive/FEATURES-phase1.md` | Phase 1 snapshot; README now has the short feature list |
| `docs/Critical-Issues-Log.md` | Moved to `docs/Archive/` | History worth keeping (seed script data-loss lesson) |
| `docs/Shopping-List-Normalisation.md` | Moved to `docs/Archive/shopping-list-design/` | Describes `baseIngredient`, no longer true; replaced by `docs/Old-Shopping-List.md` |
| `docs/Archive/Shopping-List-Feature-Design.md` | Moved into `docs/Archive/shopping-list-design/` | Grouped with other old-list design notes |
| `docs/embedding-confirmation-plan.md`, `docs/plan-shopping-list-naming-fix.md` | Moved to `docs/Archive/shopping-list-design/` | Implemented plans; history |
| `docs/Code Reviews/*` (3 files) | Moved to `docs/Archive/code-reviews/` | Snapshots by design; the `code-review` skill now writes there |
| `.claude/plans/*` (3 files) | Moved to `docs/Archive/claude-plans/` | Old implementation records that mention removed files |
| `docs/Archive/Mobile-Responsiveness-Plan.md` | Kept in place | Already in the Archive |
| `docs/Specs/MCP.md` | Updated (v0.3, section 4.7 plan tools) | It stopped at 4.6 |
| `docs/Old-Shopping-List.md` | New | Current description of the hidden old list |
| `restock-agent/` | Deleted | Superseded (S14/S15), see above |
| `lib/purchase-history/`, `lib/ingredientHelpers.ts`, `lib/ai/index.ts`, `prisma/migrateIngredients.ts`, `app/(modules)/purchase-history/` | Deleted | Unused, see above |
| `docs/rehaul/**` | Untouched | Out of scope |

## Handoff

- **Push.** The session environment's default branch name was `claude/intelligent-goodall-gna6uv`; per `_common.md` I work on `rehaul_phase_cleanup`. That name matches the `rehaul_phase*` allow-list in `vercel.json`, so it will get a preview.
- **Rehaul docs still name removed files.** `docs/rehaul/PLAN.md`, the session prompts and `docs-sync.md` mention `FEATURES.md`, `QUICKSTART`, and `restock-agent/`. I did not edit them (not mine to edit); they are history now.
- **Unused database things (no changes made, for Ronen to decide):**
  - `PurchaseHistory.masterItemId` (and its relation to `MasterListItem`): nothing in the app reads or writes it now.
  - `Recipe.ingredients` text column: still read as a fallback (already in BACKLOG).
  - `ShoppingListItem.matchConfidence` / `similarityScore` / `masterItemId`: old list only (already in BACKLOG).
  - `AgentRun.trigger` values `schedule` and `mcp` are in the TypeScript type but nothing writes them (not a database issue).
  - No whole table is unused. `NormalisationCache` and the old-list tables are used only by the old list.
- **knip leftovers I did not delete:** 20 files under `scripts/` (demo seeders, Playwright scripts, one-off analysis and backfill tools), plus roughly 30 exports that are only used inside their own file or by tests (`lib/nextWeek/predict.ts` constants, `lib/mcp/tools/planTools.ts` handlers, `types/index.ts` aliases, and similar). Exports used by tests were left; trimming them is cosmetic.
- **Not checked on Vercel:** the preview build itself (the local production build passes); the Mermaid rendering on GitHub.

## Try on the preview

1. Open **Shopping** on a phone: you should see only the Next week list, no tab bar.
2. **Settings > Preferences:** tick **Show old shopping list**. Go back to Shopping: five tabs (Next week, Meals, Staples, Restock, List) and the old list works as before. Settings now also has Master Lists and Categories.
3. Untick it: Shopping is back to Next week only, Settings back to Dish Types and Preferences. (The setting is shared by everyone on this preview's database copy.)
4. Open `ARCHITECTURE.md` on the PR's branch in GitHub and check all six diagrams draw.
5. Look at `/agent-runs` and Recipes quickly to confirm nothing else moved.

## Proposed doc updates

- **`push-to-prod` skill (flagged, not changed):** it tells Claude to merge the branch into `main` and push directly, which is a production deploy without a preview or PR. It contradicts the PR flow in `claude.md` and PLAN rule 7. Options: delete it; or rewrite it as "run tests, push the branch, open a PR, stop". Ronen decides.
- **`db-migrations` skill:** its frontmatter name is `db-migration` (singular) but the folder, and `_common.md`, say `db-migrations`. Rename the frontmatter if you want both to match.
- **`docs/rehaul/PLAN.md` / `docs-sync.md`:** drop references to `FEATURES.md` and `restock-agent/` (S16 is done by this run).
- **Decide whether to fix `npm run lint`** (BACKLOG): the skills now say to rely on `tsc` and tests instead.
- **Later:** remove the old shopping list (BACKLOG, "Later") and with it the only OpenAI use, `PurchaseHistory.masterItemId`, and the embedding column.
