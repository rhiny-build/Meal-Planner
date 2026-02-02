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

## Implementation Phases

### Phase 1: Foundation
- [ ] Add `Staple` and `RestockItem` tables to schema
- [ ] Add `source` field to `ShoppingListItem` (replace `isManual`)
- [ ] Run migration, convert existing data
- [ ] Update types in `types/index.ts`

### Phase 2: Master List Management
- [ ] Create `/staples` page (or section in settings)
- [ ] CRUD API for staples: add, edit, delete, reorder
- [ ] Simple UI: list view with add input, delete buttons
- [ ] Repeat for RestockItem

### Phase 3: Assembly Flow
- [ ] Update "Generate" to include staples by default
- [ ] Add UI for reviewing/removing staples from current week
- [ ] Add UI for selecting restocking items to include
- [ ] Update shopping list display to show source

### Phase 4: Polish
- [ ] UX review and iteration on assembly flow
- [ ] Consider grouping/filtering options
- [ ] Mobile experience optimization

---

## Open Questions

1. **Naming**: "Staples" and "Restocking Items" - are these the right names for the UI?
2. **Master list location**: Separate page, settings section, or accessible from shopping list page?
3. **Quantity handling**: Should staples have default quantities that copy to weekly list?

---

## Related Files

- `prisma/schema.prisma` - Database schema
- `app/shopping-list/` - Shopping list UI
- `lib/hooks/useShoppingList.ts` - Shopping list state management
- `app/api/shopping-list/` - API routes

---

*Document created: 2026-02-02*
*Last updated: 2026-02-02*
