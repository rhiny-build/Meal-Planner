# Backlog

## Next Up: Ingredient Mapping UI + Master List Gaps

### Context

The 5-step sync pipeline is wired end-to-end with LLM normalisation. Testing with real data (218 ingredients, 144 after aggregation) revealed:

- **Step 3 (explicit mapping)**: 0 resolved — the `IngredientMapping` table is empty because there's no UI for users to create mappings yet
- **Step 4 (embedding match)**: 25/144 resolved — many legitimate matches fail because:
  - Embedding similarity scores are lower than expected (e.g. "egg" vs "eggs" = 0.59, "mushroom" vs "mushrooms (fresh)" = 0.70)
  - The 0.82 threshold is too high for this embedding model's behavior
  - Lowering the threshold risks false positives (e.g. "rice noodles" matching "egg noodles" at 0.74)
- **Master list gaps**: Common recipe ingredients like chicken, carrot, onion, olive oil, rice are missing from the master list entirely

### Priority: Ingredient Mapping UI

The most impactful next step is building the UI for Step 3. This lets users manually link recipe ingredients to master list items. Over time, Step 3 handles more ingredients deterministically and Step 4 (embeddings) becomes a fallback for truly new ingredients.

**What's needed:**
- Shopping list item UI shows unmatched recipe items with a way to link them to a master list item
- Linking calls `createIngredientMapping` (already exists) to persist the mapping
- Next sync, Step 3 resolves that ingredient instantly

### Also Needed: Seed Missing Restock Items

Add common cooking ingredients to the master list as restock items so Step 4 has something to match against. Current gaps from real data:
- **Proteins**: chicken breast, chicken thigh, salmon fillet, ground turkey, pancetta/bacon, tuna
- **Vegetables**: carrot, onion, red onion, green beans, tomatoes, cherry tomatoes, aubergine, white cabbage, courgette
- **Herbs/spices**: parsley, basil, dill, thyme, rosemary, oregano, cumin, paprika, chilli flakes
- **Pantry**: olive oil, balsamic vinegar, soy sauce (already exists), rice, pasta (fusilli/macaroni exist), couscous, breadcrumbs, ketchup, mayonnaise
- **Dairy**: cream, mozzarella (grated exists), parmesan, halloumi, buttermilk

---

## LLM Normalisation — State of Play

### What's Done

**Branch**: `feature_shopping_list_redesign`

1. **`normaliseIngredientCached` wired into sync pipeline** — Step 2 now uses the full normalisation chain: deterministic → DB cache → LLM fallback (if `USE_LLM=true`). All 240 tests passing.

2. **`confident` flag tightened** — only true when a meaningful rule fired (form extraction, compound exception, known staple). Singularisation and lowercasing alone no longer count as confident, so the LLM fallback actually fires for ambiguous inputs.

3. **LLM response parsing hardened** — strips markdown fences, extracts first JSON object from response.

4. **LLM fallback normaliser** (`lib/normalisation/llmNormaliser.ts`) — calls OpenAI for low-confidence inputs.

5. **Single entry point** (`lib/normalisation/normaliseWithFallback.ts`) — `normaliseIngredientCached(raw)` runs: deterministic → DB cache → LLM → cache result.

6. **`NormalisationCache` Prisma model** — migration applied. Avoids repeat LLM calls.

7. **Eval runner** (`scripts/evalNormaliser.ts`) — 72% pass with LLM (up from 56% deterministic-only).

### What's NOT Done

1. **Eval golden set tuning** — 5 cases where LLM answer differs from golden set expectation (passata, double cream, cherry tomatoes, plain flour, free range eggs). Low priority — doesn't affect pipeline.

2. **Cost/latency monitoring** — no logging of LLM call count vs deterministic vs cache hits.

### Embedding Match Quality Observations

From real-data testing, items with score >= 0.70 that should have matched:

| Score | Recipe ingredient | Best master match | Correct? |
|-------|------------------|-------------------|----------|
| 0.81 | Sweet Corn | sweet corn (frozen) | Yes |
| 0.81 | Pine nuts | pine nuts | Yes |
| 0.81 | pitted olives | olives (pitted green) | Yes |
| 0.80 | Mustard | mustard (dijon) | Yes |
| 0.76 | all-purpose flour | flour | Yes |
| 0.75 | Grated Mozzarela | cheese (mozzarella) | Yes |
| 0.74 | Garlic / Garlic powder | garlic (granules) | Yes |
| 0.72 | Humous | houmous | Yes |
| 0.71 | Mixed lettuce | lettuce (little gem) | Debatable |
| 0.80 | Red pepper flakes | red pepper (fresh) | No — different item |
| 0.78 | freshly ground pepper | red pepper (fresh) | No — different item |
| 0.74 | Rice noodles | medium egg noodles | No — different item |

No single threshold separates correct from incorrect matches. This is why Step 3 (user-confirmed mappings) is the right long-term solution — it builds certainty over time without relying on embedding similarity alone.

### File Map

| File | Purpose |
|------|---------|
| `lib/normalisation/normalise.ts` | Deterministic normaliser (pure, no AI/DB) |
| `lib/normalisation/normalise.test.ts` | 31 unit tests for deterministic normaliser |
| `lib/normalisation/llmNormaliser.ts` | LLM fallback (calls OpenAI) |
| `lib/normalisation/normaliseWithFallback.ts` | Single entry point: `normaliseIngredient` + `normaliseIngredientCached` |
| `lib/ai/prompts.ts` | All prompts including `normaliseIngredientSingle` |
| `lib/ai/client.ts` | OpenAI client singleton + `MODEL` constant |
| `scripts/evalNormaliser.ts` | Eval runner against golden test set |
| `prisma/schema.prisma` | Includes `NormalisationCache` model |
| `app/(modules)/shopping-list/actions.ts` | Shopping list sync — uses `normaliseIngredientCached` |
