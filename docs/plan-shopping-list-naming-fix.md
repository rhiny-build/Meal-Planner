# Fix Shopping List Naming & Dedup

## Context

After the file restructuring, shopping list items display internal normalised names (e.g. "garlic (fresh)") instead of user-friendly names. Additionally, dedup is weak — parsley appears 5 times, olive oil 4 times. Root causes: (1) Step 5 writes `canonicalName` to the DB `name` field, (2) dedup keys on `canonicalName` which differs per form variant, (3) `canonicalName` terminology is used everywhere instead of the agreed `normalisedName`.

## Design Decisions

- **Two representations only**: `normalisedName` (internal matching form, e.g. "garlic (fresh)") and `displayedName` (what to buy, e.g. "garlic" — derived from `baseIngredient`)
- **Dedup key**: `displayedName` (= `baseIngredient`), not `normalisedName` — this merges all form variants naturally
- **`canonicalName` is retired** — renamed to `normalisedName` everywhere

## Phases

### Phase 1: Rename `canonicalName` → `normalisedName` in runtime code ✅

**Commit:** `9e14454` — Pure terminology rename across 9 files. All 233 tests pass.

---

### Phase 2: Introduce `displayedName` and fix Step 5 DB write ✅

**Commit:** `177358f` — `NormalisedItem` now has `displayedName` (from `base`) alongside `normalisedName`. Step 5 writes `displayedName` to `ShoppingListItem.name`. All 233 tests pass.

**Still needed:** UI verification via Playwright MCP (generate list, confirm clean names).

---

### Phase 3: Fix dedup to key on `displayedName` ✅

**Scope:** Change the Step 5 dedup key from `normalisedName` to `displayedName`. This merges form variants (parsley fresh/chopped/etc → one "parsley" item).

**Files:**
- `app/(modules)/shopping-list/actions.ts` — Step 5 dedup map key
- Tests: add/update dedup test cases in `actions.test.ts`

**Verification:** `npm test` — new test case: two items with different `normalisedName` but same `displayedName` merge into one. Then UI verification via Playwright MCP: generate list and confirm parsley/olive oil appear once each.

---

### Phase 4: Migrate `RejectedSuggestion.canonicalName` → `normalisedName` ✅

**Scope:** DB migration to rename the column. Update all code referencing it.

**Files:**
- New migration: `prisma/migrations/..._rename_canonical_to_normalised/migration.sql`
- `prisma/schema.prisma` — rename field + update unique constraint + index
- `app/(modules)/shopping-list/suggestionActions.ts` — update Prisma queries
- `app/(modules)/shopping-list/actions.ts` — update rejection check logic
- Tests: update mocks

**Verification:** `npx prisma migrate dev`, all tests pass.

---

### Phase 5: Documentation cleanup ✅

- Update `claude.md` — remove all `canonicalName` references
- Update `docs/backlog.md` — mark P0 as resolved
- Update AI prompts if the LLM output field was renamed

## Files Summary

| File | Phases |
|------|--------|
| `app/(modules)/shopping-list/actions.ts` | 1, 2, 3, 4 |
| `app/(modules)/shopping-list/suggestionActions.ts` | 1, 4 |
| `components/SuggestionRow.tsx` | 1 |
| `components/EmbeddingReviewModal.tsx` | 1 |
| `lib/shopping-list/normaliseMasterItem.ts` | 1 |
| `lib/ai/prompts.ts` | 1, 5 |
| `prisma/schema.prisma` | 4 |
| `actions.test.ts`, `suggestionActions.test.ts` | 1, 2, 3, 4 |
| `claude.md`, `docs/backlog.md` | 5 |
