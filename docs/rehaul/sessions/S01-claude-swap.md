# S01 — Swap generative AI to Claude

Wave 1 · Schema: no · Depends on: none · Can run alongside: S02

Read `docs/rehaul/sessions/_common.md` first.

## Goal
Every generative AI call in the app runs on Claude. OpenAI remains **only** for embeddings. Perplexity is removed.

## Current state (verify; don't trust blindly)
- `lib/ai/client.ts` exports an OpenAI client and `MODEL` (`gpt-4o-mini`). `lib/ai/config.ts` has per-function settings, including `embeddings`.
- Generative call sites include `lib/ai/extractIngredientsFromURL.ts`, `lib/ai/modifyMealPlan.ts`, `lib/shopping-list/normaliseRecipeIngredientLLM.ts`, and `lib/aiService.ts`. Find all of them: grep for `openai.` and `chat.completions`.
- Embeddings: `lib/shopping-list/ingredientEmbeddings.ts`. Leave behaviour unchanged.
- `app/api/recipes/discover/route.ts` calls Perplexity directly.
- Ronen reports the OpenAI chat features currently don't work. So "same behaviour" means "works as originally intended", not "matches current output".

## Scope
1. Add the Anthropic SDK. Create `lib/ai/claude.ts` (client) and extend `lib/ai/config.ts` with model choices: an agent model and a cheap model. Remove the generative OpenAI exports from `client.ts`; the OpenAI client stays for embeddings only, and is renamed or moved so this is obvious.
2. Port each generative call site to Claude. Use structured output via tool use (a single forced tool with a JSON schema) wherever the current code parses JSON from free text.
3. Discovery: replace Perplexity with Claude using its web search server tool. Keep the same response shape so `InspireModal` keeps working. If web search isn't enabled on the API key, ask Ronen; don't silently degrade.
4. Env: add `ANTHROPIC_API_KEY` to `.env.example`. Remove `PERPLEXITY_API_KEY`. Keep `OPENAI_API_KEY`, noted as embeddings-only.
5. Update the existing tests in `lib/ai/ai.test.ts` and anything else that mocks OpenAI chat.

## Out of scope
Any change to embeddings or matching thresholds. Agents, tool loops and new features. Prompt quality improvements beyond what the port needs.

## Done when
- `grep -r "chat.completions" lib app` returns nothing.
- URL import, meal-plan modify, ingredient normalisation and Inspire Me each work once against real Claude (record one example of each in your log).
- Tests pass.

## Focus for "How it works" in your log
How a Claude call with a forced tool returns structured data. Compare it with the old JSON-from-text approach.
