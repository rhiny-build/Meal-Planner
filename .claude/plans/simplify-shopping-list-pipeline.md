# Simplify Shopping List Pipeline — Step 1: File Structure & Naming

## Principle
Name things after **what they do to what**, not how they do it.
Files: `[subject][Operation].ts` | Functions: `[verb][Subject][Context?]`
See `.claude/skills/naming-convention/SKILL.md` for full conventions.

---

## Phase 1: Create `lib/shopping-list/` module

### File moves & renames

| Current | Proposed | Notes |
|---------|----------|-------|
| `lib/normalisation/normalise.ts` | **Merge into** `lib/shopping-list/normaliseRecipeIngredient.ts` | Rules engine merges into the pipeline entry point |
| `lib/normalisation/normaliseRecipeIngredient.ts` | `lib/shopping-list/normaliseRecipeIngredient.ts` | Already good name; absorbs `normalise.ts` |
| `lib/normalisation/llmNormaliser.ts` | `lib/shopping-list/normaliseRecipeIngredientLLM.ts` | Says what (normalise recipe ingredient) + variant (LLM) |
| `lib/normalisation/normalise.test.ts` | `lib/shopping-list/normaliseRecipeIngredient.test.ts` | Merge tests too |
| `lib/shoppingListHelpers.ts` | `lib/shopping-list/aggregateRecipeIngredients.ts` | That's what it does |
| `lib/shoppingListHelpers.test.ts` | `lib/shopping-list/aggregateRecipeIngredients.test.ts` | Tests follow |
| `lib/ai/matchIngredients.ts` | `lib/shopping-list/matchRecipeToMaster.ts` | Says what's matched to what |
| `lib/ai/normaliseMasterItem.ts` | `lib/shopping-list/normaliseMasterItem.ts` | Already good |
| `lib/ai/embeddings.ts` | `lib/shopping-list/ingredientEmbeddings.ts` | Scoped to ingredient domain |
| `lib/ai/embeddings.test.ts` | `lib/shopping-list/ingredientEmbeddings.test.ts` | Tests follow |
| `lib/ingredientHelpers.ts` | TBD — check contents, may fold into another file | |

### Delete after merge
- `lib/normalisation/` directory (all files moved out)

---

## Phase 2: Scripts — mirror module structure

| Current | Proposed |
|---------|----------|
| `scripts/backfill-canonical-names.ts` | `scripts/shopping-list/backfillNormalisedNames.ts` |
| `scripts/evalNormaliser.ts` | `scripts/shopping-list/evalRecipeIngredientNormaliser.ts` |

---

## Phase 3: DB model rename

| Current | Proposed | Rationale |
|---------|----------|-----------|
| `NormalisationCache` | `RecipeIngredientNormalisationCache` | Says what it caches |

Requires a Prisma migration (rename table only, no data change).

---

## Out of scope (not yet migrated to modules)
- Meal plan files (`lib/mealPlanHelpers.ts`, `lib/ai/modifyMealPlan.ts`)
- Receipt/purchase history files
- Shared AI infra (`lib/ai/client.ts`, `config.ts`, `prompts.ts`, `index.ts`) — stays in `lib/ai/`
- Cross-cutting (`lib/prisma.ts`, `lib/dateUtils.ts`, etc.) — stays in `lib/` root

---

## Step 2 (future): DB/Code terminology consolidation
- Collapse `baseIngredient` / `canonicalName` / `normalisedName` to single term
- Separate plan TBD
