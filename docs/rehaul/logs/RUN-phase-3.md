# RUN: Phase 3, meal-plan agent (S11-S13)

Branch `rehaul_phase3_plan` (from `main` at the merge of PR #21, which already had the Next week list). Schema: yes (one new table).

## Built
- **Ask box on the Week page** ("swap Wednesday for fish"). It goes to a tool-using meal-plan agent, changes the plan, then shows what changed ("Wednesday main: Salmon Pea Pasta -> Pan Fried Sea Bass") plus one line from the agent. It replaces the one-shot `modifyMealPlan` and `/api/meal-plan/modify`, which are deleted.
- **Draft my week** button (replaces "Generate with AI"). It drafts **next week**, the same week the Shopping tab's Next week list is for (it calls the same `nextWeekStart()`), using day notes, tiers, quick vs full, and what was on the plan recently. Days Ronen already filled are kept. Every drafted day gets a short reason.
- The draft shows with the **"Drafted from your notes" banner and Accept all**, a reason line under each drafted day, and a "Throw away" link. Each day can still be swapped or changed before accepting. Nothing is the plan until Accept all.
- **Claude.ai via MCP**: five new tools on the existing connector: `get_plan_days`, `get_day_notes`, `set_day_note`, `search_recipes`, `set_meal_slot`. Plain data tools, so Claude.ai is the agent and there is no API cost. Writes go straight to the plan. The old tools still work.
- Every in-app agent run is on `/agent-runs` (agent `meal-plan`): each model turn, tool call and result.

## Decisions
- **How a draft is stored: a `PlanDraft` table, one row per week** (`weekStart`, `days` JSON, `summary`). Alternatives I rejected: (a) unsaved screen state, which is lost on reload and invisible to the agent and to Claude.ai; (b) a flag on `MealPlan` rows, which would let an unaccepted draft leak into the Next week list and the old shopping list, breaking "nothing counts as the plan until accepted". The draft holds the whole week as it will become the plan; each day lists the slots that were already filled (`locked`), which the agent cannot change (the tool refuses). Accept writes all seven days to `MealPlan`, marks the week's shopping list stale (as Save does) and deletes the draft. One draft per week: drafting again replaces it. A database change that only adds a table.
- **While a draft is pending, the draft is the working copy.** The Ask box and Ronen's own tweaks (swap, change a day) change the draft, not the plan. Tweaks are saved to the draft about half a second after he makes them, and a day he changed loses the agent's reason (it was about a different meal). "Save plan" while a draft is pending means Accept all.
- **Dinner only**: drafts fill protein, carb and vegetable. Lunch is left alone (the Next week list only uses dinner too).
- **Rules in code, judgement in the prompt.** In code: filled slots are locked; a recipe must fit the slot (protein/carb/vegetable/lunch type, or a quick recipe, which fits any slot); dates are validated; a recipe that was on the saved plan in the 21 days before the day gets a *warning* in the tool result (never a block); parallel slot changes are queued so they cannot overwrite each other (found in a real run: 19 changes, empty draft, until fixed). In the prompt: respect day notes, avoid repeats, mix proteins, one reason per day.
- **`search_recipes` shows `daysSinceOnPlan`** and orders longest-since-planned first, so "not had it for 3 weeks" comes from data, not memory. Results are kept short because every result is re-sent to the model on each later turn.
- **Model**: Sonnet 5.5 (`AI_CONFIG.mealPlanAgent`), with thinking turned off for this agent (this model's setting for that is `{"type": "between_tools"}`; `disabled` is rejected). Choosing recipes from search results does not need it and it cost 4-5k output tokens per draft.
- **MCP writes while a draft waits**: the write applies to the saved plan, and the reply carries a warning that accepting the waiting draft will replace it. (Writing to both would be surprising; ignoring it would lose changes silently.)
- **`maxDuration` 60 s** on the draft and ask routes, like the other AI routes. See "Real Claude" for how long a draft takes.
- **Removed with `modifyMealPlan`**: its prompt, schema, `alignMealPlan`, `applyGeneratedPlanToWeek`, their tests and types. Nothing else used them.
- The Week page no longer goes back to "Loading..." when it reloads after a change (it did, and that wiped the Ask result). Found by the browser test.
- S12 open question answered in `PLAN.md`: auto-draft is **off**, button only. S11-S13 marked done there.

## How it works
**Design.** One set of small tools, used two ways.
- `lib/mealPlanAgent/tools.ts`: plain functions: read the plan for a range, read day notes, search recipes, set or clear one slot. They talk to a `PlanStore`, which is either the saved plan (`MealPlan`) or a draft (`PlanDraft`), so they do not care which.
- In the app, `agentTools.ts` wraps them for the SDK tool runner and `runPlanAgent.ts` runs the agent. Over MCP, `lib/mcp/tools/planTools.ts` exposes the same functions to Claude.ai, which does the thinking itself.
- Draft my week = make a draft from the saved week (locking what is filled), run the agent on it, store its summary. Accept = copy the draft into the plan.

**The tool runner against the hand-rolled loop** (for learning). Both are the same idea: call Claude, run the tools it asks for, send the results back, repeat until it stops asking.
- *Hand-rolled* (`lib/agents/loop.ts`, used by the recipe importer and method capture): we wrote every step. We send the request, look at each block of the answer, run the tools, build the next message, nudge once if Claude forgets to finish, count turns, and write each step to the run log as it happens. About 190 lines. Everything is visible and changeable.
- *Tool runner* (`client.beta.messages.toolRunner`): we hand it the model, the system prompt, the first message and tools that each have a name, an input schema (zod) and a `run` function. It does the loop: calls Claude, validates the tool input against the schema, runs the `run` functions (several at once when Claude asks for several), turns exceptions into error results Claude can read, sends the results back, and stops when Claude answers without asking for a tool or after `max_iterations`. Our whole agent is `runPlanAgent.ts`, about 100 lines, and the tool definitions are short.
- *What you no longer see or control:* the messages it builds and sends (we only see each assistant reply it yields, so I log those, and I log tool calls from inside each tool's `run`); the order and timing of tool calls (it runs a reply's calls **at the same time**, which is how a lost-update bug appeared in the draft: see Decisions); the nudge and give-up rules (there is none: it stops quietly at `max_iterations`, so I check whether the last reply still wanted a tool and fail the run if so); and prompt-cache markers on the growing conversation (the hand-rolled loop puts them on each turn; the runner does not, so a draft re-sends its search results at full price on each turn. Only the system prompt is cached).
- *Why use it anyway:* less code to get wrong, schema validation for free, and parallel tools. For a loop this simple it is the right default; the hand-rolled one earns its keep when you need control (nudges, "ends the run" tools, per-turn caching).

**One real run traced** (draft, local data, 26 recipes, notes "football till 7" on Tuesday and "out" on Thursday, Friday filled with Burgers): turn 1 the model asks for the plan back four weeks, the notes, and three recipe searches at once; turn 2 it sets about 19 slots at once, with a reason on the first call of each day; turn 3 it answers with one sentence. Result: Tuesday "Football till 7: fish, quick" (Pan Fried Sea Bass), Thursday left empty ("Out: eating out"), Friday's Burgers kept, no main used twice.

## Real Claude
- **Over budget, so I stopped (needs your decision, see Handoff).** The budget is 150,000 tokens. I used **about 168,000** (input + output, cache reads counted at face value) in three local drafts while building: 23k (the first, which hit a bug and changed nothing), 59k (a parallel-write bug, empty draft), 86k (correct draft, 25-30 s). Cost is lower than the number suggests because the system prompt is cached, but I counted it the strict way.
- **Not yet run with real Claude:** the compacted search results and the tightened draft prompt (both written after the last real run), a real "swap Wednesday for fish", and a real "nothing with fish". These need about 60-80k more tokens.
- **Everything else runs on replayed responses:** the agent tests drive the real SDK tool runner through a scripted HTTP layer (`tests/helpers/scriptedClaude.ts`), and the browser test runs the production build against `scripts/meal-plan/mock-anthropic.cjs`, a script that plays a sensible agent. These prove the plumbing, not Claude's judgement.
- **Time and tokens of a real draft** (before compaction): 25-30 s, 3 model turns, about 55-82k input tokens, about 4k output. The compaction should cut the input a lot. Vercel's limit: I could not read Vercel's docs from this session (blocked), so I kept `maxDuration` at 60 s like the other routes; 30 s fits with room, but see "Try on the preview".

## Tests
- 697 unit tests (`npm test`), tsc clean.
- Integration (real Postgres): 20 agent tests (each read tool, search filters and last-on-plan, set slot rules, draft locking, parallel writes, tweaks, accept/discard, the Next week list picking up an accepted plan, and the agent on the real tool runner with scripted responses incl. the run log and the "ran out of steps" failure) and 4 MCP tests through the real server with a real MCP client.
- Production build (`next build` + `next start`), Playwright at desktop 1280 and phone 390, with the scripted model: Draft my week, reasons shown, Friday's filled day kept, "out" day left empty, draft survives reload, swap Thursday with Monday and the change survives reload (reason dropped), Ask box ("swap Wednesday for fish") with its result card, Accept all, no banner after reload, Next week shows the drafted meals, no sideways scroll. `scripts/meal-plan/e2e/`, screenshots in `docs/rehaul/logs/phase3-screens/`.
- The MCP connector checked over HTTP against the production build (`/api/mcp`): 11 tools listed, plan read, recipe search.

## Try on the preview
Check these first; I could not prove them locally.
1. **How long Draft my week takes on Vercel** (Week page, "Draft my week"). Expect about 15-30 s with the progress bar. If it says "The draft did not work", the function time limit is the first suspect (Settings, Agent runs, the newest `meal-plan` run shows how far it got).
2. Draft my week, then look at the reasons under each day, and that anything you had already filled is unchanged.
3. Swap a drafted day with another day (the swap button), reload: your change is still there.
4. Type "swap Wednesday for fish" in the Ask box. The card should say what changed.
5. Accept all, then open Shopping: Next week shows the drafted meals.
6. After merging (the connector points at production): in Claude.ai ask it to draft next week using your day notes, and check the Week page.

## Handoff
- **Decision needed: the extra real-Claude budget** (about 60-80k tokens) to finish the real checks above, or accept replayed-only for now.
- The agent's prompts are in `lib/mealPlanAgent/prompts.ts`, the model in `AI_CONFIG.mealPlanAgent`. If a real draft is slow, try Haiku there first.
- The draft rules that are only in the prompt (respect notes, avoid repeats, mix proteins) have no deterministic test, by nature; the real-run sample is what covers them.
- Over MCP there is no draft step and no login (accepted for now).
- Not done on purpose: Sunday auto-draft, MCP auth, old-code clean-up.

## Proposed doc updates
- FEATURES: Draft my week (+ Accept all, reasons), the Ask box, the five MCP plan tools; the Week page's "Generate with AI" is gone.
- ARCHITECTURE: `lib/mealPlanAgent/` (stores, tools, runner), table `PlanDraft`, agent `meal-plan` on the SDK tool runner; `modifyMealPlan` removed; hand-rolled loop vs tool runner.
- BACKLOG: add conversation caching for tool-runner agents; auth for the MCP connector; a Sunday auto-draft only if the button proves useful.
