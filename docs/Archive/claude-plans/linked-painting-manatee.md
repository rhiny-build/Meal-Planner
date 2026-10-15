# Embedding Ingredient Matching — Implementation Record

## Branch: `feature_embedding_ingredient_matching`

## Summary

Replaced LLM chat completion ingredient matching (~51s) with OpenAI embeddings + cosine similarity (~1-2s).

---

## What Was Done

### Phase 1: Schema + Infrastructure (COMPLETE)
- Added `embedding Float[]` to `MasterListItem` in `prisma/schema.prisma`
- Created `lib/ai/embeddings.ts`:
  - `computeEmbeddings(texts)` — batch OpenAI API call (`text-embedding-3-small`)
  - `cosineSimilarity(a, b)` — pure math
  - `findBestMatches(ingredientEmbeddings, masterItems, threshold)` — returns `MatchDetail[]` with `{ match, bestScore, bestCandidate }`
- Added `embeddings` config to `lib/ai/config.ts` (model + threshold 0.82)
- 11 unit tests in `lib/ai/embeddings.test.ts`

### Phase 2: Master List Mutations + Backfill (COMPLETE)
- `addMasterListItem` and `updateMasterListItem` now compute embedding from `baseIngredient` alongside normalisation (non-blocking)
- Backfill script: `scripts/backfill-embeddings.ts`
  - **Note:** Prisma's `findMany` filter doesn't work correctly with `Float[]` empty checks. Script uses raw SQL (`array_length(embedding, 1) IS NULL`) as a workaround. TODO: revisit when Prisma improves array field support.

### Phase 3: Replace LLM Matching (COMPLETE)
- Rewrote `lib/ai/matchIngredients.ts`:
  - Same function name `matchIngredientsAgainstMasterList`
  - `MatchInput` now takes `masterItems: { baseIngredient, embedding }[]` instead of `masterListBaseIngredients: string[]`
  - `MatchResultItem` now includes `bestScore` and `bestCandidate` for debugging
- Updated `syncMealIngredients` in `actions.ts` to fetch master items with embeddings
- Removed unused LLM prompt (`buildMatchIngredientsPrompt`) and config (`matchIngredients`)

### Phase 4: Debug Logging (COMPLETE)
- `syncMealIngredients` writes a timestamped log to `logs/embedding-match-<timestamp>.log` on each sync
- Log shows matched items with scores and unmatched items with their best candidate + score
- `logs/` added to `.gitignore`

---

## Commits

1. `6d2ae8a` — Add embedding infrastructure (schema, utilities, tests)
2. `c283f19` — Compute embeddings on master list item create/update
3. `304b5a8` — Add backfill script for existing items
4. `53ab928` — Replace LLM matching with embedding similarity
5. `878c0f0` — Remove unused LLM prompt/config, update Phase-Progress
6. `04f0ace` — Add debug logging for match scores, fix backfill query

---

## Known Issues / TODO

- **Prisma Float[] filtering**: `embedding: { isEmpty: true }` doesn't work in `findMany`. Backfill uses raw SQL. The `syncMealIngredients` query uses `embedding: { isEmpty: false }` which does work for filtering items that *have* embeddings.
- **Threshold tuning**: Currently 0.82. Debug logs show scores for unmatched items — review to decide if threshold should be lowered.
- **Tests need updating**: `embeddings.test.ts` and `actions.test.ts` need updates to match the new `findBestMatches` return type (`MatchDetail` instead of `string | null`). Low priority since the debug logging is temporary.

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/ai/embeddings.ts` | `computeEmbeddings`, `cosineSimilarity`, `findBestMatches` |
| `lib/ai/matchIngredients.ts` | `matchIngredientsAgainstMasterList` (embedding-based) |
| `lib/ai/config.ts` | `AI_CONFIG.embeddings` (model, threshold) |
| `app/(modules)/shopping-list/actions.ts` | Sync flow + debug log writing + mutation hooks |
| `scripts/backfill-embeddings.ts` | One-time backfill for existing items |
| `prisma/schema.prisma` | `embedding Float[]` on `MasterListItem` |

## Production Deployment

1. Run migration: `npx prisma migrate deploy`
2. Run backfill: `npx tsx scripts/backfill-embeddings.ts`
3. New master list items get embeddings automatically on create/update
