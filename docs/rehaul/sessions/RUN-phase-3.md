# Run: Phase 3, meal-plan agent (S11–S13)

Read `docs/rehaul/sessions/_common.md` and `docs/rehaul/PLAN.md` first. Work unsupervised, use the `claude.md` message format, and follow "Real Claude spend" (budget: 150k tokens for the whole run).

## Why
Planning the week is still manual, and the current AI edit (`modifyMealPlan`) is a one-shot prompt that changes the plan without explaining itself. Ronen wants to ask for changes in plain words, get a whole week drafted with a reason per day, and do both from Claude.ai too.

## Branch
One session, one branch: **`rehaul_phase3_plan`**, created from the latest `main`. Push it after meaningful milestones only (each push builds a preview). One PR to `main` at the end; don't merge it. Before every push, check the branch's PR isn't already merged (`claude.md`).

## Reference material
- `docs/rehaul/mockups/Week.dc.html`: the approved design. It has the "Drafted from your notes / Accept all" banner, a reason line per day and the "Ask" box. The UX refresh built the week list but deliberately left these three out. This run adds them, in the existing style.
- Decision D7 in `PLAN.md`: agents from now on use the Anthropic TypeScript SDK's **tool runner** (`client.beta.messages.toolRunner` in the installed SDK), not the hand-rolled loop in `lib/agents/loop.ts`. Read the SDK's docs for it first.
- Decision D9: every agent run is recorded (`AgentRun` / `AgentStep`) and shows on `/agent-runs`. These agents must too, on the tool runner.

## Scope
1. **Meal-plan agent (S11):** one tool-using agent on the tool runner. It can:
   - read the plan for a range of days;
   - read day notes;
   - search recipes, using kind, tier, and when each was last on the plan;
   - set or clear one slot on one day.
   Give it small tools that each do one thing.
   - **Ask box** on the Week page: "swap Wednesday for fish" goes to this agent. It replaces `modifyMealPlan` and its route; remove them once nothing uses them.
   - After a change, show what changed, with one line from the agent.
2. **Draft my week (S12):** a **button** on the Week page. No schedule; a Sunday auto-draft is out of scope.
   - Drafts the **next** week: the same week the Shopping tab's Next week view is for. Reuse its definition of "next week"; don't write a second one.
   - Uses day notes ("football till 7", "out"), recipe tiers, kind (quick vs full) and what was on the plan in recent weeks, to avoid repeats.
   - **Days Ronen has already filled are kept.** Only empty slots are drafted.
   - Every drafted day gets a short reason (as in the mockup: "Football till 7: done by 7:30", "Not had it for 3 weeks").
   - The draft is shown with the banner and **Accept all**, and each day can still be changed or swapped before accepting. Nothing counts as the plan until it's accepted. How a draft is stored is your call (database changes only add); explain the choice in the log.
   - Once accepted, the Next week shopping list must reflect it (it already recalculates from the plan; check that it does).
   - The existing AI fill button is replaced by Draft my week.
3. **Claude.ai via MCP (S13):** add plan tools to the existing MCP server, so Ronen can draft or adjust the week in a Claude.ai chat.
   - **Claude.ai is the agent here.** Expose plain data tools (read plan, read and write day notes, search recipes, set a slot), not a tool that runs the in-app agent. That keeps it free of API cost. Reuse the same functions as S11's tools.
   - Writes from MCP apply straight to the plan (no draft step). The connector has no login. That's accepted for now; auth comes later, as its own piece of work.
   - Keep the existing tools working.

## Out of scope
- Sunday schedule or any cron.
- MCP authentication.
- Clean-up of old code (master items, old docs, `restock-agent/`). That's a separate run after this one.
- Shopping list behaviour, apart from checking that Next week picks up an accepted plan.

## Testing
- Unit tests for each agent tool, and for the draft rules (filled days kept, notes respected, no repeat of last week's dinners when there's an alternative).
- Replayed (recorded) Claude responses for agent tests. Real Claude for at most 5 cases in total: e.g. a swap, a "nothing with fish", a full draft with notes.
- The MCP tools tested through the server, as the existing recipe tools are.
- Playwright at desktop and phone widths: Ask box, Draft my week, change a day, Accept all, then Next week shows the drafted meals.
- Production mode (`npm run build && npm start`), per "It must run on Vercel" in `_common.md`. An agent run must fit Vercel's function time limit; check the current limit in Vercel's docs and say in the log how long a draft takes.

## Finish
- Log: `docs/rehaul/logs/RUN-phase-3.md`, with every section from `_common.md`. Under "How it works", explain the tool runner against the hand-rolled loop for Ronen (he's learning agents): what the SDK now does for you, and what you can no longer see.
- Update `PLAN.md`: mark S11–S13 done, and answer the S12 open question ("off; button only, for now").
- PR to `main`. Message Ronen what to try on the preview: draft a week, swap a day by asking, accept, and check Next week. Then the Claude.ai test after merging, since the connector points at production.
