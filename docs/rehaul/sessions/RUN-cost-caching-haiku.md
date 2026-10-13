# Run: prompt caching and a Haiku vs Sonnet comparison

Read `docs/rehaul/sessions/_common.md` first, especially "Real Claude spend". Work unsupervised, and use the `claude.md` message format.

## Branch
Work on **`rehaul_phase1_cost`** (it already exists; check it out). Commit per change and push. When done, open **one PR to `main`**. Don't merge it.

## 1. Prompt caching
Goal: stop paying full price for the same text on every call. Cache reads on Sonnet 5.5 cost 5% of normal input, and on Haiku 5.5, 10% (see the pricing docs: https://platform.claude.com/docs/en/about-claude/pricing).
- Add prompt caching to every Claude call site: the agent loop (`lib/agents/loop.ts`), and `lib/ai/claude.ts` / `lib/ai/discoverRecipes.ts` where the repeated prefix is long enough to be cached. Cache the stable prefix: tool definitions, the system prompt and, in the loop, the conversation so far. Follow the current prompt caching docs for placement, minimum cacheable length and limits. Don't rely on memory.
- Prove it works: run one real import, and show from the usage numbers that turns 2+ read from the cache. The run log already records `cacheReadTokens` / `cacheCreationTokens`; make sure they're filled.
- Add tests (replayed responses) that check the cache markers are in the requests.

## 2. Haiku vs Sonnet for the recipe importer
Goal: decide whether Import (and the backfill) can use Haiku 5.5, which is about 20× cheaper than Sonnet 5.5.
- **5 cases**, each run once on each model (10 real runs, with caching on):
  1. A clean recipe page with structured data: https://www.recipetineats.com/
  2. A messier recipe page: pick one from https://www.bowlofdelicious.com/ or https://www.loveandlemons.com/
  3. A page with no clear method: https://www.themediterraneandish.com/ (pick an article-style page)
  4. A dead link (any 404)
  5. Free text: "My schnitzel: chicken breast flattened, dip in egg, then breadcrumbs, fry 4 minutes a side in oil."
  Pick concrete recipe URLs on those sites. If a site can't be reached from the session, that's a blocker: tell Ronen. Don't substitute fixture pages.
- **Compare per case:** correct name and ingredients, quantities kept as written, method present only if it's on the page (never invented), correct kind (full/quick), steps that reference ingredients. Plus tokens in and out, cost, and time taken.
- **Write it up in your log** as a table, with a recommendation for which model Import should use, and why.
- **Don't switch the model.** Put the recommendation in the PR description; Ronen decides.

## Finish
- Log: `docs/rehaul/logs/RUN-cost-caching-haiku.md`: what changed, the caching proof (numbers), the comparison table, the recommendation, and real-Claude tokens spent.
- PR to `main`. Message Ronen in the `claude.md` format: the recommendation, and the cost per import before and after.
