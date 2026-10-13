# RUN-cost-caching-haiku

Branch `rehaul_phase1_cost`. Two jobs: prompt caching on every Claude call, and a Haiku 5.5 vs Sonnet 5.5 comparison for the recipe importer. **The importer model was not switched.**

## Built
- Every Claude call now marks its stable prefix for caching, so repeat calls pay about 5% (Sonnet) or 10% (Haiku) for that text instead of full price.
- A comparison script (`scripts/rehaul/compareImporterModels.ts`) ran the importer 10 times with real Claude: 5 cases × 2 models.
- Recommendation: use Haiku 5.5 for Import and the backfill (see below). Ronen decides.

## Decisions
- **Explicit cache markers, not the top-level `cache_control` shortcut.** The installed SDK (0.133.0) has no type for the top-level field, so I place markers on blocks (docs: https://platform.claude.com/docs/en/build-with-claude/prompt-caching).
- **Two markers per request** (limit is 4): one on the system prompt (which also caches the tool definitions before it) and one on the last block of the conversation. The second moves forward each turn; the helper copies the messages, so markers from earlier turns never pile up.
- **Minimum cacheable length is 512 tokens** on both Sonnet 5.5 and Haiku 5.5. Shorter prefixes are just not cached; marking them is harmless, so the small single-shot calls (`callForcedTool`: meal-plan edits, ingredient normalisation) are marked too and cache whenever their system prompt is long enough.
- Added an optional `model` override to `runRecipeImporter` for the comparison script only. The configured model is unchanged.
- Run log: `cacheReadTokens` / `cacheCreationTokens` were already wired in the loop and are filled with real numbers (no schema change). Per-turn cache numbers are not stored (per-run totals only), so the script records them from the API responses.
- Case 3 (see caveat below): the Mediterranean Dish page I picked is a roundup, so both models correctly refused it.

## How it works
Claude's API reads the prompt in order: tools, system prompt, conversation. A `cache_control` marker says "remember everything up to here". The next request with an identical beginning reads it back cheaply, for 5 minutes, refreshed on each use.
- `lib/ai/cache.ts` has two helpers: `cachedSystem(text)` and `withConversationCache(messages)`.
- `lib/agents/loop.ts` uses both on every turn. `lib/ai/claude.ts` (`callForcedTool`) and `lib/ai/discoverRecipes.ts` use them too.
- Because the tools and system prompt are identical for every import, a second import within 5 minutes reads them from the cache even on its first turn (visible in cases 2–5 below: the first turn already read ~2.6k tokens).

## Caching proof (real import: case 1, Sonnet 5.5, a cold cache)
| Turn | New input | Cache read | Cache written | Output |
|---|---|---|---|---|
| 1 | 4 | 0 | 2,581 | 140 |
| 2 | 2 | **2,581** | 3,756 | 2,313 |

Haiku, same page, 5 turns: reads 0 → 2,581 → 6,118 → 6,287 → 9,059 tokens. Each turn reads what the previous turn wrote. Run totals are stored in the run log (`AgentRun.cacheReadTokens` / `cacheCreationTokens`).

Tests (replayed responses): `lib/agents/loop.test.ts` (markers on system + last block, on every turn, only one marker on the conversation, earlier markers removed), `lib/ai/discoverRecipes.test.ts`, `lib/ai/claude.test.ts`. `npm test`: 536 passed.

**Honest size of the win.** An import is dominated by output tokens (the recipe JSON, ~2.4k tokens at $10/M on Sonnet), and the prompts are small (~2.6k tokens of tools + system, ~5k with the page). So caching saves about 4% on a cold, two-turn Sonnet import (case 1: $0.0406 vs $0.0424 uncached; the 1.25× cache-write premium nearly cancels the savings) and 25–60% when the cache is warm. It matters more for longer runs (Haiku's 5-turn run read 68% of its input from cache) and for the backfill, which runs imports back to back.

## Haiku vs Sonnet (each case run once per model, caching on, dev key)
Prices per million tokens: Sonnet 5.5 $2 in / $10 out / $0.10 cache read / $2.50 cache write; Haiku 5.5 $0.10 / $0.50 / $0.01 / $0.125.
URLs: 1 https://www.recipetineats.com/oven-baked-chicken-schnitzel/ · 2 https://www.bowlofdelicious.com/caldo-verde/ · 3 https://www.themediterraneandish.com/fast-dinner-recipes/ · 4 https://www.recipetineats.com/this-recipe-does-not-exist-404-check/ · 5 free text.

| Case | Model | Result | Turns | Tokens in (incl. cache) / out | Cost | Time |
|---|---|---|---|---|---|---|
| 1 clean | Sonnet | full, 13 ingredients, 11 steps | 2 | 8,924 / 2,453 | $0.0406 | 15.0 s |
| 1 clean | Haiku | full, 13 ingredients, 11 steps | 5 | 35,252 / 7,191 | $0.0052 | 24.9 s |
| 2 messy | Sonnet | full, 11 ingredients, 5 steps | 2 | 7,275 / 1,783 | $0.0239 | 11.4 s |
| 2 messy | Haiku | full, 11 ingredients, 5 steps | 3 | 11,804 / 2,452 | $0.0016 | 10.1 s |
| 3 roundup | Sonnet | refused: "roundup, no single recipe" | 2 | 8,642 / 260 | $0.0121 | 4.2 s |
| 3 roundup | Haiku | refused: same reason | 2 | 8,642 / 310 | $0.0007 | 2.7 s |
| 4 dead link | Sonnet | refused: 404 | 2 | 5,277 / 158 | $0.0026 | 4.9 s |
| 4 dead link | Haiku | refused: 404 | 2 | 5,277 / 158 | $0.0002 | 2.7 s |
| 5 free text | Sonnet | full, 4 ingredients, 3 steps | 2 | 5,312 / 659 | $0.0077 | 7.4 s |
| 5 free text | Haiku | full, 4 ingredients, 5 steps | 2 | 5,795 / 1,171 | $0.0007 | 6.5 s |

Quality, per case:
- **1 clean:** Both: correct name, all 13 ingredients, quantities as written, full method, kind full, steps reference ingredients. Differences: Haiku wrote the chicken as quantity `2`, unit `x` (an invented unit; Sonnet left the unit empty) and left carb type empty (Sonnet: "other"). Haiku **failed `submit_recipe` twice** (it sent an empty ingredient list; the tool rejected it) before getting it right, which is why it took 5 turns and 7× the tokens of Sonnet. Result still correct.
- **2 messy:** Both correct. Sonnet kept "½" as written; Haiku turned it into "1/2" (same meaning, not verbatim). Haiku dropped "(Caldo Verde)" from the name. Both 5 steps, nothing invented.
- **3 roundup:** Both refused and said why, with a useful suggestion. Not a test of "recipe present, method missing" (see caveat).
- **4 dead link:** Identical, correct 404 explanation.
- **5 free text:** Both correct ingredients, no quantities invented, no invented times (only the 4 minutes a side). Haiku split frying into two steps and named it "My Schnitzel" (the user's words); Sonnet named it "Chicken Schnitzel". Haiku also noted a possible duplicate in the book.

Totals: Sonnet $0.0849 (all 5 cases), Haiku $0.0084. Per successful import: Sonnet ≈ $0.024 average, Haiku ≈ $0.0025 average, about **10× cheaper** (not the 20× list-price ratio, because Haiku used more turns and wrote more output).

### Caveat
Case 3 did not test what it was meant to: the page I chose is a link roundup, so the right answer is a refusal and nothing was learned about "a recipe with no method on the page". I did not find a suitable page and stopped there to stay inside the token budget. Case 5 (a vague free-text method) is the only evidence that neither model invents method steps. One run per model per case is a small sample; the Haiku failure in case 1 might be a one-off or a pattern.

## Recommendation
**Use Haiku 5.5 for Import and the backfill.** Quality matched Sonnet on every case on what matters (name, ingredients, quantities, no invented method, correct kind, step references). Cost drops about 10×, from about 2.4 cents to about 0.25 cents per import. Weak spots seen: occasional sloppy field values (an invented unit "x", "½" rewritten as "1/2"), one case of mis-calling the final tool twice (self-corrected, and the draft is reviewed by Ronen before saving anyway), and slower on that case. For the backfill, which is reviewed in a report before anything is applied, these cost nothing. If Ronen cares about verbatim quantities, keep Sonnet for URL imports and use Haiku for the backfill only.
To switch: change `recipeImporter.model` in `lib/ai/config.ts` to `CLAUDE_MODELS.cheap`.

## Cost per import, before and after caching
- Sonnet, cold cache, 2 turns: $0.0424 → $0.0406. Warm cache (the common case if you import several recipes in a row): ≈ $0.032 → ≈ $0.024.
- Haiku with caching: ≈ $0.0025 per import.

## Real Claude tokens spent
10 import runs: 102,200 input tokens (of which 102,132 were cache reads/writes) + 16,595 output = **118,795** (budget 150,000). The proof run is case 1. Total spend $0.095.
(No other real-Claude calls.)

## Try on the preview
Nothing user-visible changes. If you import a recipe on the preview and open /agent-runs, the run should show non-zero cache read tokens on its later turns.

## Handoff
- To use Haiku for Import: change one line in `lib/ai/config.ts` (see above). Not done.
- Per-turn cache numbers are not in the database (only run totals). Add columns later if wanted (schema change).
- `scripts/rehaul/compareImporterModels.ts` re-runs the comparison (costs real money).

## Proposed doc updates
- ARCHITECTURE: note that all Claude calls go through `lib/ai/cache.ts` helpers for prompt caching.
