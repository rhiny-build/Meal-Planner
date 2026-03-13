# Embedding Confirmation UX — Implementation Plan

## User Flow

### Current behaviour

Today, saving a meal plan automatically triggers the shopping list sync pipeline in the background. The pipeline silently decides which recipe ingredients match master list items (pantry staples) — matches above 82% similarity are auto-resolved, the rest become unmatched shopping list items. The user has two entry points into the shopping list: the per-meal tab and the combined shopping list tab.

### Problems with this

1. **Good-but-imperfect matches are lost** — an ingredient at 75% similarity becomes an unmatched item even though the user would have confirmed it
2. **Bad matches happen silently** — an ingredient wrongly matched at 83% is suppressed and the user never knows
3. **Save and sync are coupled** — every meal save triggers a full pipeline run, even if the user isn't ready to shop yet

### Redesigned flow

**Two separate user actions:**

1. **Save meal** — just saves the meal plan. No pipeline, no side effects. Works exactly as today minus the sync trigger.

2. **Generate shopping list** — an explicit button, available on both tabs (meal tab and shopping list tab). This is the moment the user says "I'm ready to plan my shopping." Clicking it:
   - Runs the pipeline (aggregate → normalise → mapping lookup → embedding match → dedup)
   - The embedding step now uses a *lower* threshold, collecting medium-confidence matches as **suggestions** rather than auto-resolving them
   - If there are suggestions, a **review modal** opens immediately (Mockup A style: "Before we generate your list…")
   - For each suggestion the user can:
     - **Confirm** — "Yes, garlic = garlic (granules) in my pantry." Item is removed from the shopping list. A mapping is written so this never surfaces again.
     - **Reassign** — "Not that item, but it *is* this other one." User picks the correct master item. Same outcome: mapping written, item removed.
     - **Reject** — "This isn't in my pantry at all." Item stays on the shopping list. A rejection is recorded so this suggestion doesn't reappear.
   - Once all suggestions are resolved, the user clicks "Continue" and sees the final, clean list.
   - If there are zero suggestions, the list appears immediately — no interruption.

**Staleness after meal changes:**

If the user modifies the meal plan after generating the shopping list, the list becomes stale. Rather than silently re-syncing:
- A visual indicator appears on the shopping list: **"Meal plan changed — list may be out of date"** with a **"Regenerate"** button
- Clicking "Regenerate" re-runs the full pipeline and the review flow (if new suggestions arise)
- The staleness flag is set whenever a meal is saved and a shopping list already exists for that week

**Over time**, the mapping table fills up and fewer suggestions appear — the system learns.

---

## Technical Plan

### 2a. Pipeline Changes

**Current state:** `syncPipeline.ts` Step 4 (lines ~194–264) calls `matchIngredientsAgainstMasterList()` with a threshold of 0.82. Items above the threshold are marked `matchConfidence: 'embedding'` and resolved. Items below are `unmatched`. The pipeline is triggered automatically on meal save.

**Revised pipeline order** (Steps 1–3 unchanged, Steps 4–5 revised):

1. Aggregate raw recipe ingredients
2. Normalise
3. **Mapping table lookup** — query `IngredientMapping` for all normalised names. Matched items get `matchConfidence: 'explicit'` and are resolved. This already works today and stays unchanged.
4. **Embedding match (only for unmapped items)** — only ingredients that had no mapping hit enter this step. This avoids wasting embedding API calls on already-resolved items.
5. Cross-recipe dedup + write

**Changes needed:**

1. **Decouple save from sync.** Remove the automatic `syncMealIngredients()` call from the meal save action. The pipeline is now only triggered by the explicit "Generate shopping list" button.

2. **Lower the auto-resolve threshold and add a suggestion band.** In `lib/ai/config.ts`, introduce two thresholds:
   - `autoMatchThreshold: 0.90` — above this, auto-resolve and **write to IngredientMapping** (so this match is explicit next time)
   - `suggestionThreshold: 0.65` — between 0.65 and 0.90, surface as a suggestion
   - Below 0.65, ignore entirely

3. **Modify Step 4 in `syncPipeline.ts`** to produce two outputs:
   - `autoMatched` items (score ≥ 0.90) — written to DB as `matchConfidence: 'embedding'`, **and** a mapping is created so future runs resolve them in Step 3 (no repeat embedding)
   - `suggestions` items (0.65 ≤ score < 0.90) — returned to the caller but **not yet written to DB**

4. **Change `syncMealIngredients()` return type** to include the suggestions array:
   ```typescript
   type EmbeddingSuggestion = {
     ingredientName: string      // raw recipe ingredient
     canonicalName: string       // normalised form
     suggestedMasterItemId: string
     suggestedMasterItemName: string
     score: number
   }

   // Return: { listId: string, suggestions: EmbeddingSuggestion[] }
   ```

5. **Pipeline does NOT pause.** The shopping list items for suggestion-band ingredients are written as `matchConfidence: 'pending'` (new value). The review modal reads these pending items. When the user resolves them, they're either removed (confirm/reassign) or updated to `unmatched` (reject).

6. **Filter out previously rejected suggestions.** Before surfacing suggestions, query the rejection table and exclude any `(canonicalName, masterItemId)` pairs that were previously rejected.

7. **Staleness tracking.** When a meal is saved and a shopping list already exists for that week, set a `stale` flag on the `ShoppingList` record (new boolean column, default `false`). The "Generate shopping list" action resets it to `false`.

### 2b. Data Model Changes

**1. New `RejectedSuggestion` model** (preferred over adding a boolean to IngredientMapping, since rejections are a fundamentally different concept — there's no mapping to store):

```prisma
model RejectedSuggestion {
  id              String   @id @default(cuid())
  canonicalName   String   // normalised ingredient name
  masterItemId    String   // the master item that was wrongly suggested
  masterItem      MasterListItem @relation(fields: [masterItemId], references: [id], onDelete: Cascade)
  createdAt       DateTime @default(now())

  @@unique([canonicalName, masterItemId])
}
```

**Why a separate table?** IngredientMapping represents *positive* learned associations. Mixing in rejections adds conceptual complexity and forces nullable `masterItemId` or confusing semantics. A separate table is cleaner and queryable independently.

**2. New `matchConfidence` value:** Add `'pending'` to the set of allowed values (`'explicit' | 'embedding' | 'unmatched' | 'pending'`). Pending items are suggestions awaiting user review.

**3. No changes to `IngredientMapping`** — confirm and reassign both use the existing `createIngredientMapping()` upsert.

**4. `stale` flag on `ShoppingList`:** Add `stale Boolean @default(false)` to the `ShoppingList` model. Set to `true` on meal save (if a list exists for that week), reset to `false` when the pipeline runs.

**5. Migration:** One migration that adds the `RejectedSuggestion` table and `stale` column. No data backfill needed.

### 2c. Server Actions

Three new actions in a new file `app/(modules)/shopping-list/suggestionActions.ts`:

**`confirmSuggestion(shoppingListItemId: string, masterItemId: string)`**
- Write mapping via existing `createIngredientMapping(recipeName, masterItemId)`
- Delete the shopping list item (it's now covered by the master list item)
- Return updated list

**`reassignSuggestion(shoppingListItemId: string, newMasterItemId: string)`**
- Write mapping with the user-chosen master item via `createIngredientMapping(recipeName, newMasterItemId)`
- Delete the shopping list item
- Return updated list

**`rejectSuggestion(shoppingListItemId: string, masterItemId: string, canonicalName: string)`**
- Create `RejectedSuggestion` record `{ canonicalName, masterItemId }`
- Update the shopping list item: set `matchConfidence` from `'pending'` to `'unmatched'`, clear `masterItemId`
- Return updated list

All three should use `revalidatePath` to refresh the shopping list page.

### 2d. UI Components

**1. "Generate shopping list" button**
- Appears on both the meal tab and the shopping list tab
- Calls `syncMealIngredients()` server action
- Shows a loading spinner while the pipeline runs
- On completion: if suggestions exist, opens the review modal. If none, refreshes the list.

**2. Staleness banner**
- Shown on the shopping list when `ShoppingList.stale === true`
- Text: "Meal plan changed — list may be out of date"
- Contains a "Regenerate" button that triggers the same flow as "Generate shopping list"

**3. `EmbeddingReviewModal`** (based on Mockup A)
- Lives at `app/(modules)/shopping-list/components/EmbeddingReviewModal.tsx`
- Props: `suggestions: PendingSuggestion[]`, `masterItems: MasterListItem[]`, `onComplete: () => void`
- Full-screen modal overlay (not a separate page — works from either tab)
- Calls the three suggestion server actions
- Shows progress counter, enables "Continue" when all resolved
- On "Continue", closes modal and refreshes the shopping list

**4. Reuse from Mockup A:** The `ReassignDropdown` (searchable master item picker) and `ScoreBadge` can be extracted as shared components. The `SuggestionRow` pattern maps directly to the real implementation.

### 2e. Test Coverage

**Critical paths to test:**

1. **Pipeline produces suggestions correctly:**
   - Items with score ≥ 0.90 → auto-matched, mapping written to `IngredientMapping` (no suggestion)
   - Items with 0.65 ≤ score < 0.90 → returned as suggestions, written as `pending`
   - Items with score < 0.65 → ignored, written as `unmatched`
   - Previously rejected pairs → filtered out of suggestions

2. **Server actions:**
   - `confirmSuggestion` → creates mapping, deletes shopping list item
   - `reassignSuggestion` → creates mapping with different master item, deletes item
   - `rejectSuggestion` → creates RejectedSuggestion, updates item to `unmatched`
   - Duplicate rejection (idempotent) → no error

3. **Integration:**
   - Full sync → review → confirm all → shopping list has no pending items
   - Mix of confirm/reassign/reject → correct final state

4. **Staleness flag:**
   - Meal save when list exists for that week → `stale` set to `true`
   - Generate shopping list → `stale` reset to `false`
   - Meal save when no list exists → no flag set

**Existing tests that need updating:**
- `actions.test.ts` — the sync pipeline tests mock the embedding step. Need to update expectations for the new two-tier threshold and `pending` confidence value.
- Any test asserting on `matchConfidence` values needs to account for `'pending'`.
- Meal save tests need to verify sync is no longer called automatically.

### 2f. Other Considerations

**Score storage:** The `EmbeddingSuggestion` needs the similarity score for display, but we don't persist scores on `ShoppingListItem` today. Options:
- Add an optional `similarityScore` float column to `ShoppingListItem` (simple, one migration)
- Pass scores via the sync return value and hold in client state (no schema change, but lost on page refresh)
- Recommendation: add the column — it's useful for debugging and costs nothing

**Threshold tuning:** The 0.65–0.90 band was tuned from an initial 0.50 floor after real usage showed too many low-quality suggestions. The thresholds live in `lib/ai/config.ts` so they're easy to adjust further.

**Edge case — no suggestions:** If the pipeline produces zero suggestions (all items either auto-matched or below 0.65), the review screen is skipped entirely. The user sees the shopping list immediately.

**Edge case — master item deleted:** If a master item is deleted after a suggestion is created but before it's resolved, the suggestion should be treated as stale. The review screen should filter out suggestions where the master item no longer exists.

**Breaking change — decoupled save/sync:** Meal save will no longer auto-generate the shopping list. Users who relied on this implicit behaviour will need to click "Generate shopping list" explicitly. This is the intended design change, but worth noting as a user-facing behaviour shift.

**Non-breaking:** The existing explicit mapping flow and delete-modal flow continue to work unchanged. The new `'pending'` confidence value is additive. Old shopping lists with no pending items behave exactly as before.

### 2g. Constraints

**File size guidelines (from CLAUDE.md) — enforced during implementation:**
- Orchestrator components (e.g. ShoppingListClient): max 200 lines
- Leaf components (e.g. EmbeddingReviewModal, SuggestionRow): max 150 lines (ideally 100–120)
- Hooks: 50–80 lines
- Server actions files: max 200 lines
- Helpers: 30–60 lines

If any new or modified file would exceed these limits, split into smaller focused modules before merging. This applies especially to the review modal — extract `SuggestionRow`, `ReassignDropdown`, `ScoreBadge` as separate leaf components rather than inlining everything.

**Production-safe migrations:**
- All schema changes (RejectedSuggestion table, `similarityScore` column, `stale` flag) must be in a single Prisma migration that runs via `prisma migrate deploy` with no manual steps
- No backfill scripts required — all new columns have defaults or are nullable
- No seed data needed

---

## Implementation Phases

### Phase 1: Data model + decouple save/sync
- Add `RejectedSuggestion` model, `similarityScore` column on ShoppingListItem, `stale` flag on ShoppingList — single migration
- Remove automatic sync from meal save action
- Add staleness flag: meal save sets `stale = true` when list exists for that week
- Tests for staleness behaviour

### Phase 2: Pipeline changes
- Modify `syncPipeline.ts` Step 4 for two-tier thresholds (0.90 auto / 0.65 suggestion)
- Filter out previously rejected suggestions
- Update `syncMealIngredients()` return type to include suggestions array
- Pipeline resets `stale = false` on run
- Tests for pipeline changes

### Phase 3: Server actions
- `confirmSuggestion`, `reassignSuggestion`, `rejectSuggestion`
- Tests for all three actions

### Phase 4: UI
- "Generate shopping list" button on both tabs
- Staleness banner with "Regenerate" button
- `EmbeddingReviewModal` (extracted from Mockup A, wired to real actions)
- Searchable master item dropdown for reassign

### Phase 5: Polish + cleanup
- Remove mockup pages
- Update docs
- Threshold tuning based on real data
