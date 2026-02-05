# Mobile Responsiveness Implementation Plan

## Current State (as of Feb 5, 2025)

**Branch:** `feature_mobile_responsiveness`

### Completed Work

1. **Viewport metadata** - Added to `app/layout.tsx`
2. **Mobile hamburger menu** - Added to `components/Header.tsx`
3. **Page padding** - Added `px-4` to all page containers:
   - `app/page.tsx`
   - `app/recipes/page.tsx`
   - `app/(modules)/shopping-list/components/ShoppingListClient.tsx`
4. **Mockup page** - Created at `app/mockups/meal-plan-mobile/page.tsx` with 3 layout options

### User Decision

User chose **Option B: Swipe/Navigate** for the meal plan mobile layout:
- Shows one day at a time
- Prev/Next navigation arrows
- Day indicator dots
- Recipe names should be **clickable links** to recipe URL (when available)

---

## Remaining Work

### 1. Create `MealPlanMobile.tsx`

**Location:** `app/meal-plan/components/MealPlanMobile.tsx`

**Features:**
- Shows one day at a time with prev/next navigation
- Day indicator dots at the top
- Recipe cards with color scheme matching desktop:
  - Lunch: amber (`bg-amber-50`, `border-amber-500`, `text-amber-700`)
  - Protein: fuchsia (`bg-fuchsia-50`, `border-fuchsia-500`, `text-fuchsia-700`)
  - Carb: cyan (`bg-cyan-50`, `border-cyan-500`, `text-cyan-700`)
  - Vegetable: lime (`bg-lime-50`, `border-lime-500`, `text-lime-700`)
- Recipe names are clickable links when `recipe.recipeUrl` exists (see `MealPlanDrawer.tsx` lines 38-49 for pattern)
- Read-only view on mobile (no editing)

**Props needed (same as MealPlanGrid):**
```typescript
interface MealPlanMobileProps {
  weekPlan: WeekPlan[]
  lunchRecipes: RecipeWithIngredients[]
  proteinRecipes: RecipeWithIngredients[]
  carbRecipes: RecipeWithIngredients[]
  vegetableRecipes: RecipeWithIngredients[]
}
```

**Reference:** The mockup at `app/mockups/meal-plan-mobile/page.tsx` has working code for Option B (the swipe layout).

### 2. Modify `MealPlanGrid.tsx`

Add responsive rendering:
```tsx
return (
  <>
    {/* Mobile view - hidden on md and up */}
    <div className="md:hidden">
      <MealPlanMobile
        weekPlan={weekPlan}
        lunchRecipes={lunchRecipes}
        proteinRecipes={proteinRecipes}
        carbRecipes={carbRecipes}
        vegetableRecipes={vegetableRecipes}
      />
    </div>

    {/* Desktop view - hidden on mobile */}
    <div className="hidden md:block">
      <DndContext ...>
        {/* existing grid code */}
      </DndContext>
    </div>
  </>
)
```

### 3. Delete Mockup Page

After implementation is complete and tested:
```bash
rm -rf app/mockups/meal-plan-mobile/
```

### 4. Commit and Merge

```bash
git add .
git commit -m "Add mobile meal plan view with day navigation"
# Then run /push-to-prod skill
```

---

## Key Files Reference

- **Desktop drawer with recipe links:** `app/meal-plan/components/MealPlanDrawer.tsx` (lines 38-49)
- **Current grid:** `app/meal-plan/components/MealPlanGrid.tsx`
- **Types:** `types/index.ts` (WeekPlan, RecipeWithIngredients)
- **Mockup with working code:** `app/mockups/meal-plan-mobile/page.tsx`

---

## Testing Checklist

- [ ] Mobile: Meal plan shows one day at a time
- [ ] Mobile: Can navigate between days with arrows
- [ ] Mobile: Day dots show current position
- [ ] Mobile: Recipe names link to recipe URL when available
- [ ] Desktop: Grid layout unchanged
- [ ] Desktop: Drag and drop still works
- [ ] Header hamburger menu works on mobile
- [ ] All pages have proper mobile padding
