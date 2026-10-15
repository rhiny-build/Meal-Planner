# Normalisation Code Review — 2025-03-16

## Ingredient Execution Trace: "2 garlic cloves" → Shopping List Item

Here is the exact path a single ingredient takes through the pipeline, naming every function, table, and decision point.

### Step 1: Collect + Aggregate

```
MealPlan table → prisma.mealPlan.findMany(include structuredIngredients)
    ↓
collectIngredientsFromMealPlans()          [lib/shoppingListHelpers.ts:115]
    → iterates 4 recipe slots (lunch, protein, carb, vegetable)
    → returns RawIngredient[] = [{ name: "2 garlic cloves", recipeName: "Chicken Stir Fry" }]
    ↓
aggregateIngredients()                     [lib/shoppingListHelpers.ts:86]
    → stripUnitsFromName("2 garlic cloves") → "garlic cloves"
    → lowercases → "garlic cloves"
    → groups by exact string match → AggregatedItem { name: "garlic cloves", sources: ["Chicken Stir Fry"] }
```

### Step 2: Normalise

```
normaliseIngredientCached("garlic cloves")  [lib/normalisation/normaliseWithFallback.ts:37]
    ↓
normaliseName("garlic cloves")              [lib/normalisation/normalise.ts:79]
    → lowercase: "garlic cloves"
    → stripUnitsFromName: "garlic cloves" (no-op, already stripped in Step 1)
    → compound exception check: no match
    → scan tokens: "cloves" → FORM_KEYWORDS["cloves"] = "fresh"
    → base: remove "cloves" token → "garlic", singularise → "garlic"
    → canonical: "garlic (fresh)", confident: true
    ↓
confident=true → RETURN EARLY, skip LLM and DB cache
    ↓
Result: { canonical: "garlic (fresh)", base: "garlic", form: "fresh", confident: true }
    ↓
Pipeline sets: NormalisedItem.canonicalName = "garlic (fresh)"
```

### Step 3: Explicit Mapping Lookup

```
IngredientMapping table → prisma.ingredientMapping.findMany(where recipeName IN ["garlic cloves"])
    ↓
Decision: mapping found for "garlic cloves"?
    → YES → resolved=true, matchConfidence="explicit", masterItemId=mapping.masterItemId. DONE.
    → NO  → proceed to Step 4
```

### Step 4: Embedding Match (two-tier)

```
MasterListItem table → prisma.masterListItem.findMany(where canonicalName NOT NULL, embedding NOT EMPTY)
    ↓
computeEmbeddings(["garlic (fresh)"])       [lib/ai/embeddings.ts:16]
    → OpenAI text-embedding-3-small API → number[][]
    ↓
matchIngredientsAgainstMasterList()         [lib/ai/matchIngredients.ts:34]
    → findBestMatches()                     [lib/ai/embeddings.ts:180]
        → for each master item: cosineSimilarity(ingredientVec, masterVec)
        → returns best match + score
    ↓
Decision tree (thresholds from AI_CONFIG):
    → score >= 0.90 (autoMatchThreshold)
        → resolved=true, matchConfidence="embedding", masterItemId set
        → FIRE-AND-FORGET: write IngredientMapping for future Step 3
    → score >= 0.65 (suggestionThreshold)
        → check RejectedSuggestion table → if rejected, skip
        → matchConfidence="pending", masterItemId set, similarityScore set
        → added to suggestions[] array returned to UI
    → score < 0.65
        → stays unmatched
```

### Step 5: Cross-Recipe Dedup + Write

```
items.filter(i => !i.resolved)              [actions.ts:337]
    → NOTE: "embedding" auto-matched items HAVE resolved=true, so they are EXCLUDED here
    → NOTE: "explicit" items also excluded
    → Only "pending" and "unmatched" items remain
    ↓
dedupMap by canonicalName (string equality)
    → merges sources for items sharing same canonicalName
    ↓
ShoppingListItem table:
    → DELETE all source='recipe' items for this week
    → CREATE new items with: name, canonicalName, matchConfidence, masterItemId, similarityScore
    ↓
ShoppingList.stale = false
```

**Key observation**: Items matched with `matchConfidence="explicit"` or `matchConfidence="embedding"` (auto) are **not written to the shopping list at all**. They're considered "covered by your master list" and silently dropped. Only `pending` and `unmatched` items appear on the list.

---

## Findings

### F1: TWO SEPARATE NORMALISATION SYSTEMS (Critical)

There are two completely independent normalisation systems that serve different purposes but have confusingly similar names:

| System | Location | Used By | Purpose |
|--------|----------|---------|---------|
| **A: Local normaliser** | `lib/normalisation/normalise.ts` → `normaliseWithFallback.ts` | Pipeline Step 2 (recipe ingredients) | Produces `canonical` ("garlic (fresh)"), `base`, `form` |
| **B: AI batch normaliser** | `lib/ai/normaliseIngredients.ts` | `addMasterListItem`, `updateMasterListItem`, backfill scripts | Produces `baseIngredient` ("garlic"), `canonicalName` ("garlic (fresh)") |

System A normalises **recipe ingredients** during the pipeline. System B normalises **master list items** when they're added/edited.

**The problem**: These two systems use different field names for the same concept, and there's no guarantee they produce the same output for the same input. The pipeline embeds the `canonical` from System A and compares against the `canonicalName` from System B. If they diverge (e.g., System A says "garlic (fresh)" but System B says "garlic"), embedding similarity may still work, but it's fragile and hard to reason about.

### F2: `baseIngredient` ON MasterListItem IS DEAD WEIGHT

`MasterListItem.baseIngredient` is stored in the DB but **never read by the pipeline**. The pipeline:
- Step 4 queries master items by `canonicalName` (not `baseIngredient`)
- Embeddings are computed from `canonicalName` (not `baseIngredient`)

The only places `baseIngredient` is written:
- `addMasterListItem` / `updateMasterListItem` in actions.ts (writes both `baseIngredient` and `canonicalName`)
- `backfill-base-ingredients.ts` script (writes only `baseIngredient`, predates `canonicalName`)
- `backfill-canonical-names.ts` script (writes both)

The only place `baseIngredient` is **read**: `backfill-embeddings.ts` — but this script embeds from `baseIngredient`, which contradicts the pipeline that matches against `canonicalName` embeddings. **This means `backfill-embeddings.ts` produces embeddings that may not match what the pipeline expects.**

**Recommendation**: Remove `baseIngredient` from the schema. `canonicalName` is the source of truth for matching.

### F3: `similarityThreshold` (0.82) IS A ZOMBIE CONFIG VALUE

`AI_CONFIG.embeddings.similarityThreshold` = 0.82 is marked "legacy" in a comment. It's the default for `findBestMatches()`, but the pipeline **never uses this default** — it explicitly passes `suggestionThreshold` (0.65) and then applies its own two-tier logic. The only effect of 0.82 is:
- It's logged in the debug output (line 87 of actions.ts: `Embedding match threshold: ${AI_CONFIG.embeddings.similarityThreshold}`) — which is **misleading**, since the actual threshold used is 0.65
- It's the default param in `findBestMatches()`, which would only matter if someone called that function without a threshold — but nobody does in the pipeline

**Recommendation**: Remove `similarityThreshold`. Keep only `autoMatchThreshold` and `suggestionThreshold`.

### F4: `deduplicateByEmbedding` IS UNUSED IN THE PIPELINE

`deduplicateByEmbedding()` in `lib/ai/embeddings.ts:71` is a sophisticated centroid-based clustering function (50+ lines). It's **not called anywhere in the pipeline**. Step 5 deduplicates by exact `canonicalName` string match instead.

It's imported only in its own test file and referenced in `actions.test.ts` as a mock — suggesting it was once part of the pipeline but was replaced.

**Recommendation**: Delete `deduplicateByEmbedding` and its types (`DeduplicableItem`, `DeduplicationResult`), or move it to a separate file if you plan to use it in the future.

### F5: `filterByMasterList` IS UNUSED IN THE PIPELINE

`filterByMasterList()` in `lib/shoppingListHelpers.ts:147` filters aggregated items against master list base ingredients. It's **only referenced in test files**. The pipeline doesn't call it — matching is handled by the embedding/mapping steps instead.

**Recommendation**: Delete it.

### F6: `normaliseNames` (BATCH) IS UNUSED

`normaliseNames()` in `lib/normalisation/normalise.ts:143` is a batch wrapper around `normaliseName`. It's only used in its own test file. The pipeline calls `normaliseIngredientCached` per-item instead.

**Recommendation**: Delete it.

### F7: `normaliseIngredient` (NON-CACHED) IS ONLY USED BY EVAL SCRIPT

`normaliseIngredient()` in `lib/normalisation/normaliseWithFallback.ts:14` (without caching) is only imported by `scripts/evalNormaliser.ts`. The pipeline always uses `normaliseIngredientCached`. Having both exported is confusing.

**Recommendation**: Make `normaliseIngredient` private or inline it into `normaliseIngredientCached`. The eval script can use the cached version too (it just won't cache since there's no DB in eval context).

### F8: NAMING IS CONFUSING

Per your rule #2, `normaliseWithFallback` is meaningless. The naming across the codebase is inconsistent:

| Function | What it actually does |
|----------|----------------------|
| `normaliseName` | Deterministic rule-based normalisation (strip units, extract form, singularise) |
| `normaliseIngredient` | normaliseName + optional LLM fallback |
| `normaliseIngredientCached` | normaliseName + DB-cached LLM fallback |
| `normaliseIngredients` (AI) | Completely different: LLM batch normalisation for master list product names |

The file is called `normaliseWithFallback.ts` but the concept is "this is the normaliser the pipeline uses." Suggested renames:

- `lib/normalisation/normaliseWithFallback.ts` → `lib/normalisation/index.ts` (single entry point, export `normaliseRecipeIngredient`)
- `normaliseIngredientCached` → `normaliseRecipeIngredient` (describes what it does)
- `lib/ai/normaliseIngredients.ts` → `lib/ai/normaliseMasterItems.ts` (describes what it does)

### F9: `stripUnitsFromName` IS CALLED TWICE

For every ingredient:
1. `aggregateIngredients()` calls `stripUnitsFromName(ing.name)` in Step 1
2. `normaliseName()` calls `stripUnitsFromName(cleaned)` again in Step 2

The second call is a no-op since units were already stripped. It's not a bug but it's wasted work and muddies the contract — should normalisation assume clean input or not?

**Recommendation**: Document that `normaliseName` expects pre-cleaned input, or remove the call from `aggregateIngredients` and let normalisation own it entirely. Pick one.

### F10: `matchIngredientsAgainstMasterList` RECOMPUTES `canonicalName` UNNECESSARILY

In `lib/ai/matchIngredients.ts:65`, the function sets `canonicalName: name.toLowerCase()` on each result — but this is just lowercasing the input text. The **actual** canonicalName was already computed in Step 2 and is what was passed as input. This field on the result object is misleading and unused by the caller.

### F11: `backfill-base-ingredients.ts` SCRIPT IS OBSOLETE

This script only writes `baseIngredient` without `canonicalName` or embeddings. It was superseded by `backfill-canonical-names.ts` which writes all three fields. Keeping it around is confusing.

**Recommendation**: Delete `backfill-base-ingredients.ts`.

### F12: `backfill-embeddings.ts` EMBEDS FROM `baseIngredient`, NOT `canonicalName`

Line 60: `const texts = batch.map((item) => item.baseIngredient as string)`

But the pipeline matches against embeddings of `canonicalName`. If `baseIngredient` = "garlic" and `canonicalName` = "garlic (fresh)", the embedding will be for "garlic" but the pipeline expects it to represent "garlic (fresh)". This is a **data correctness bug** if this script is run after `backfill-canonical-names.ts` has already set `canonicalName`.

**Recommendation**: Either delete this script (since `backfill-canonical-names.ts` handles embeddings correctly) or fix it to embed from `canonicalName`.

### F13: FIRE-AND-FORGET DB WRITES WITH `.catch(() => {})`

In Step 3 (line 183) and Step 4 (line 272-285), mapping updates/creates are fire-and-forget with swallowed errors. If these fail silently, the system won't learn from pipeline runs. The `confirmedCount` increment (Step 3) and the new mapping write (Step 4 auto-match) are both important for the system to improve over time.

**Recommendation**: At minimum, log errors instead of swallowing them. Better: await these writes (they're fast DB operations, not worth the risk of silent failure).

---

## Summary: Recommended Cleanup Actions

| # | Action | Files | Effort |
|---|--------|-------|--------|
| 1 | Remove `baseIngredient` from schema + all references | schema.prisma, actions.ts, backfill scripts | Medium |
| 2 | Delete `similarityThreshold` from config, fix misleading log | lib/ai/config.ts, actions.ts | Small |
| 3 | Delete `deduplicateByEmbedding` + types | lib/ai/embeddings.ts, test files | Small |
| 4 | Delete `filterByMasterList` | lib/shoppingListHelpers.ts, test files | Small |
| 5 | Delete `normaliseNames` batch wrapper | lib/normalisation/normalise.ts, test | Small |
| 6 | Rename files and functions for clarity (F8) | lib/normalisation/*, lib/ai/normaliseIngredients.ts | Medium |
| 7 | Fix double `stripUnitsFromName` call (F9) | aggregateIngredients or normaliseName | Small |
| 8 | Delete `backfill-base-ingredients.ts` | scripts/ | Small |
| 9 | Delete or fix `backfill-embeddings.ts` (F12) | scripts/ | Small |
| 10 | Stop swallowing errors on fire-and-forget writes (F13) | actions.ts | Small |
| 11 | Remove unused `canonicalName` field from `MatchResultItem` (F10) | lib/ai/matchIngredients.ts | Small |

## Verification

After cleanup:
1. `npm test` — all existing tests should pass (update/remove tests for deleted code)
2. `npm run build` — no import errors
3. Run the pipeline on a real week — check debug log output matches expected behaviour
4. Verify master list item add/edit still normalises + embeds correctly
