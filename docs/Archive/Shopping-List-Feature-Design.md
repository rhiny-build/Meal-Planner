# Shopping List Feature Design

## Overview

The shopping list is assembled from multiple sources to create a complete weekly shopping list. This document outlines the data model, user workflow, and implementation plan.

## Shopping List Components

A complete weekly shopping list consists of:

1. **Staples** - Items bought every week (bread, milk, eggs)
   - Managed as a master list (rarely updated)
   - Default: **included** in weekly list
   - User removes exceptions during assembly

2. **Restocking Items** - Household goods replenished as needed (toilet paper, oil, salt)
   - Managed as a master list (rarely updated)
   - Default: **excluded** from weekly list
   - User adds what's needed during assembly

3. **Meal Ingredients** - Generated from the week's meal plan
   - Automatically extracted from selected recipes
   - Already implemented

4. **Manual Items** - One-off additions for the current week only
   - Added during assembly or while shopping
   - Not persisted to any master list

---

## Data Model

### New Tables

```prisma
// Master list of weekly staple items
model Staple {
  id        String   @id @default(cuid())
  name      String
  quantity  String?  // Optional default quantity
  unit      String?  // Optional default unit
  order     Int      // Display order
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// Master list of restocking items (less frequent purchases)
model RestockItem {
  id        String   @id @default(cuid())
  name      String
  quantity  String?  // Optional default quantity
  unit      String?  // Optional default unit
  order     Int      // Display order
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Modified Table

```prisma
model ShoppingListItem {
  // ... existing fields ...

  // NEW: Replace isManual with source enum
  source     String   // 'meal' | 'staple' | 'restock' | 'manual'

  // REMOVE: isManual Boolean @default(false)
}
```

### Migration Notes

- Migrate existing `isManual: true` items to `source: 'manual'`
- Migrate existing `isManual: false` items to `source: 'meal'`

---

## Weekly Planning Workflow

### Step 1: Plan Meals (Existing)
User creates/updates the weekly meal plan on the Meal Plan page.

### Step 2: Assemble Shopping List

#### 2a. Generate Meal Ingredients
- Click "Generate" to extract ingredients from selected recipes
- Items created with `source: 'meal'`

#### 2b. Review Staples
- All staples auto-included by default
- User can remove items not needed this week
- Items created with `source: 'staple'`

#### 2c. Add Restocking Items
- Restocking items shown but not included by default
- User selects what needs restocking this week
- Items created with `source: 'restock'`

#### 2d. Manual Additions
- User can add one-off items
- Items created with `source: 'manual'`

### Step 3: Shop
- Use the list while shopping
- Check items as purchased

---

## UX Considerations (Future Review)

**Assembly UI Complexity:**
The assembly process involves multiple item sources. The UI needs careful design to avoid overwhelming users:

- Consider tabs or accordion sections for each source type
- Staples review could be a quick checklist (pre-checked, uncheck to remove)
- Restocking could be a simple add-from-list picker
- Final assembled list should show all items together, possibly grouped by source

**Display Options to Explore:**
- Single merged list with source indicators
- Grouped by source (Staples | Restocking | Meal Ingredients | Manual)
- Grouped by store section (Produce | Dairy | Meat | etc.) - future enhancement

---

## Future Enhancements

### Receipt Upload (Later Phase)
Upload actual shopping receipts to capture real purchase data:
- OCR/parse receipt into structured items
- Match against shopping list items
- Build accurate purchase history for AI features

### AI-Driven Suggestions (Later Phase)
Leverage purchase history to provide insights:
- "You haven't bought olive oil in 8 weeks - running low?"
- "You usually buy bananas every week but didn't add them"
- Suggest restocking items based on typical purchase frequency

**Data Requirements:**
- Weekly shopping lists already provide purchase history via `checked` + `weekStart`
- `source` field enables queries like "how often is X (from restock) purchased?"
- Receipt data would provide ground truth for actual purchases

---

## Architecture Approach

This feature will be built as a **module** following the target architecture (see ARCHITECTURE.md).

### Module Structure

```
/app/(modules)/shopping-list/    # Route group keeps URL as /shopping-list
  page.tsx              # Server component - fetches list data via Prisma
  actions.ts            # Server actions for all mutations
  components/
    ShoppingListClient.tsx  # Client component - state management
    ShoppingListItems.tsx   # Client component - item display and interactions
    ShoppingListHeader.tsx  # Client component - navigation and actions
    AddItemForm.tsx         # Client component - manual item entry
    StaplesManager.tsx      # Client component - staples CRUD (Phase 2)
    RestockManager.tsx      # Client component - restock items CRUD (Phase 2)
```

### Data Flow Pattern

| Operation | Mechanism |
|-----------|-----------|
| Load shopping list | Server component (`page.tsx`) queries Prisma |
| Load staples/restock lists | Server component queries Prisma |
| Add/update/delete item | Server action in `actions.ts` |
| Check/uncheck item | Server action |
| Generate list from meal plan | Server action (creates items, revalidates page) |
| Manage staples/restock items | Server actions |

### Why No API Routes?

This module has no external integration needs - all operations are internal UI mutations. Server actions provide:
- Type safety between client and server
- Built-in CSRF protection
- Simpler code (no fetch boilerplate)

---

## Implementation Phases

### Phase 1: Module Setup & Foundation ✅ COMPLETE

**Outcome:** Shopping list works exactly as before, but code is restructured as a module with server actions. New data model in place. No user-facing changes.

- [x] Create module structure (`/app/(modules)/shopping-list/` with `actions.ts`, `components/`)
- [x] Add `Category` and `MasterListItem` tables to schema (unified approach instead of separate Staple/RestockItem)
- [x] Add `source` field to `ShoppingListItem` (replace `isManual`)
- [x] Run migration, convert existing data
- [x] Migrate existing shopping list code into module structure
- [x] Remove legacy API routes and hooks
- [ ] Tests: Unit tests for server actions (deferred)
- [x] Docs: Update ARCHITECTURE.md with actual module structure

### Phase 2: Master List Management ✅ COMPLETE

**Outcome:** Users can create and manage their staples list and restock items list. These are "set once, use weekly" master lists.

- [x] Create settings page with master list management UI (`/settings`)
- [x] Server actions for staples/restock: add, edit, delete
- [x] UI: Accordion by category, inline editing, add form with category dropdown
- [ ] Reorder items within categories (deferred - future enhancement)
- [ ] Tests: Unit tests for staples/restock server actions (deferred)

### Phase 3: Assembly Flow ✅ COMPLETE

**Outcome:** Users can generate a complete weekly shopping list that combines meal ingredients + staples + selected restock items + manual additions. Full workflow functional.

- [x] Update "Generate" to include staples by default
- [x] Add UI for reviewing/removing staples from current week (Staples tab with checkboxes)
- [x] Add UI for selecting restocking items to include (Restock tab with checkboxes)
- [x] Update shopping list display to show source (via notes field)
- [ ] Tests: Integration tests for assembly flow (deferred)
- [ ] Docs: Update user-facing README with new workflow

### Phase 4: Polish ⏳ IN PROGRESS

**Outcome:** Shopping list is production-ready with good UX across devices.

- [ ] UI bug fixes (current session)
- [ ] Remove mockup pages (`/mockups/*`)
- [ ] UX review and iteration on assembly flow
- [ ] Consider grouping/filtering options
- [ ] Mobile experience optimization
- [ ] Remove auto-seed from build script once data is stable
- [ ] Tests: Review coverage, add edge case tests
- [ ] Docs: Final review, ensure all docs are current

---

## Open Questions

1. **Naming**: "Staples" and "Restocking Items" - are these the right names for the UI?
2. **Master list location**: Separate page, settings section, or accessible from shopping list page?
3. **Quantity handling**: Should staples have default quantities that copy to weekly list?

---

## Related Files

**Module:**
- `app/(modules)/shopping-list/page.tsx` - Server component, data fetching
- `app/(modules)/shopping-list/actions.ts` - Server actions for mutations
- `app/(modules)/shopping-list/actions.test.ts` - Unit tests
- `app/(modules)/shopping-list/components/` - Client components

**Shared:**
- `prisma/schema.prisma` - Database schema (source of truth)
- `lib/shoppingListHelpers.ts` - Business logic (aggregation, formatting)

---

*Document created: 2026-02-02*
*Last updated: 2026-02-04*
