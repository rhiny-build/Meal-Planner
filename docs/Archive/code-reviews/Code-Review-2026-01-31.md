# Code Review Report - 2026-01-31

## Summary

Overall, the Meal-Planner codebase is well-structured with good separation of concerns, comprehensive type safety, and solid test coverage (102 tests passing). The architecture follows Next.js best practices with clear patterns for API routes, hooks, and components.

This review identifies areas for improvement based on the project's own guidelines in CLAUDE.md and general best practices.

---

## Areas for Improvement

### 1. Debug UI Exposed in Production

**Location**: [meal-plan/page.tsx:150-167](app/meal-plan/page.tsx#L150-L167)

**Issue**: The debug prompt textarea for testing AI prompts is visible to all users. This should be hidden behind a development flag or removed entirely for production.

**Impact**: Medium - Exposes internal functionality to end users, potential confusion

**Ease of Fix**: Easy - Wrap in `process.env.NODE_ENV === 'development'` check

```tsx
{process.env.NODE_ENV === 'development' && (
  <div className="my-4 p-4 border border-dashed...">
    {/* Debug UI */}
  </div>
)}
```

---

### 2. File Size Guideline Violations

**Locations**:
- [RecipeForm.tsx](components/RecipeForm.tsx) - 299 lines (guideline: max 150)
- [MealPlanGrid.tsx](app/meal-plan/components/MealPlanGrid.tsx) - 243 lines (guideline: max 150)
- [useMealPlan.ts](lib/hooks/useMealPlan.ts) - 232 lines (guideline: 50-80 for hooks)

**Issue**: Several files exceed the project's own file size guidelines defined in CLAUDE.md.

**Impact**: Low - Code still works but harder to maintain

**Ease of Fix**: Medium

**Suggestions**:
- **RecipeForm.tsx**: Extract AI import section into a separate `AIImportSection` component
- **MealPlanGrid.tsx**: The options conversion logic (lines 109-127) could be extracted to a helper function
- **useMealPlan.ts**: Consider splitting into smaller hooks (e.g., `useMealPlanNotes`, `useMealPlanRecipes`)

---

### 3. Inconsistent Error Handling with `alert()`

**Locations**:
- [apiService.ts:100, 105, 110](lib/apiService.ts#L100)
- [meal-plan/page.tsx:93, 96, 118](app/meal-plan/page.tsx#L93)
- [useRecipes.ts:91, 110, 130](lib/hooks/useRecipes.ts#L91)

**Issue**: The codebase uses `alert()` for user notifications which is jarring UX and inconsistent across the app. Some errors show alerts, others fail silently (as noted in the TODO in useShoppingList.ts).

**Impact**: Medium - Poor user experience, inconsistent behavior

**Ease of Fix**: Medium - Requires creating a toast/notification system

**Suggestions**:
1. Create a simple toast notification component
2. Create a custom hook `useNotification` that provides `showSuccess`, `showError` methods
3. Replace all `alert()` calls with the notification system
4. Ensure all error paths show appropriate feedback (address the TODO in useShoppingList.ts)

---

### 4. Documentation Mismatch - Database Provider

**Locations**:
- [CLAUDE.md](CLAUDE.md) - References SQLite
- [prisma/schema.prisma:10](prisma/schema.prisma#L10) - Uses PostgreSQL

**Issue**: CLAUDE.md states `DATABASE_URL="file:./dev.db"` and mentions SQLite, but the schema uses PostgreSQL provider.

**Impact**: Low - Could cause confusion for new contributors

**Ease of Fix**: Easy - Update CLAUDE.md to reflect actual PostgreSQL usage

---

### 5. Duplicate `formatIngredient` Function

**Locations**:
- [RecipeForm.tsx:17-24](components/RecipeForm.tsx#L17-L24)
- [RecipeCard.tsx:18-25](components/RecipeCard.tsx#L18-L25)

**Issue**: Identical function defined in two components.

**Impact**: Low - Code duplication, maintenance burden

**Ease of Fix**: Easy - Extract to a shared utility in `lib/ingredientHelpers.ts`

---

### 6. localStorage Hydration Risk

**Location**: [meal-plan/page.tsx:27-32](app/meal-plan/page.tsx#L27-L32)

**Issue**: `localStorage` is accessed during component initialization outside of a useEffect. While there's a `typeof window !== 'undefined'` check, this can still cause hydration mismatches in Next.js.

**Impact**: Low - Can cause React hydration warnings in development

**Ease of Fix**: Easy - Move localStorage access into a useEffect with initial state of `getMonday(new Date())`

```tsx
const [startDate, setStartDate] = useState<Date>(() => getMonday(new Date()))

useEffect(() => {
  const lastVisited = localStorage.getItem('mealPlanLastVisited')
  if (lastVisited) {
    setStartDate(getMonday(new Date(lastVisited)))
  }
}, [])
```

---

### 7. API Service Contains UI Logic

**Location**: [apiService.ts:100-110](lib/apiService.ts#L100-L110)

**Issue**: `saveMealPlan` function calls `alert()` which is UI logic. API services should only handle data operations and return results, letting the calling component handle UI feedback.

**Impact**: Medium - Violates separation of concerns, makes testing harder

**Ease of Fix**: Easy - Remove alerts and return success/error status for the caller to handle

```typescript
// Before
if (response.ok) {
  alert('Meal plan saved!')
  // ...
}

// After
if (response.ok) {
  return { success: true, data: await fetchMealPlan(startDate, days) }
} else {
  return { success: false, error: error.error || 'Failed to save' }
}
```

---

### 8. Missing `useCallback` Optimizations

**Location**: [useRecipes.ts:26-36, 38-58](lib/hooks/useRecipes.ts#L26-L58)

**Issue**: `fetchRecipes` and `applyFilters` functions are recreated on every render but used in useEffect dependencies (implicitly through the dependency array). This could cause unnecessary re-renders.

**Impact**: Low - Minor performance concern

**Ease of Fix**: Easy - Wrap functions in `useCallback`

---

### 9. Missing Shopping List Item Delete Feature

**Locations**:
- [ShoppingListItems.tsx](app/shopping-list/components/ShoppingListItems.tsx)
- [apiService.ts](lib/apiService.ts) - No `deleteShoppingListItem` function

**Issue**: Users can add manual items to the shopping list but there's no visible way to delete them (though the API route exists at `/api/shopping-list/item/delete`).

**Impact**: Medium - Missing expected functionality

**Ease of Fix**: Medium - Add delete button to items and wire up the API call

---

### 10. Missing Response Validation in API Calls

**Locations**: Multiple API functions in [apiService.ts](lib/apiService.ts)

**Issue**: API responses are cast directly to types without validation. For example:
```typescript
return json as Recipe[];
```

If the API returns unexpected data, runtime errors could occur deep in the component tree.

**Impact**: Low - Could cause cryptic errors if API contract changes

**Ease of Fix**: Medium - Add runtime validation with Zod or simple type guards

---

### 11. Delete Operations Missing Confirmation in Hook

**Location**: [useRecipes.ts:116-134](lib/hooks/useRecipes.ts#L116-L134)

**Issue**: `handleDelete` contains a `confirm()` call (browser UI). Like `alert()`, this mixes UI with business logic.

**Impact**: Low - Inconsistent architecture

**Ease of Fix**: Easy - Move confirmation to the component level, make hook function purely async

---

### 12. Prisma Schema Comment Reference Missing File

**Location**: [prisma/schema.prisma:3](prisma/schema.prisma#L3)

**Issue**: Comment references `validations.ts` for consistency but this file doesn't exist in the codebase.

**Impact**: Low - Misleading documentation

**Ease of Fix**: Easy - Either create the validations file or remove the comment

---

## Quick Wins (Can be done in < 30 minutes each)

1. Hide debug UI in production (Issue #1)
2. Fix CLAUDE.md database documentation (Issue #4)
3. Extract duplicate `formatIngredient` function (Issue #5)
4. Fix localStorage hydration issue (Issue #6)
5. Remove/update orphaned comment in schema (Issue #12)

## Recommended Priority Order

| Priority | Issue # | Description |
|----------|---------|-------------|
| High | 1 | Hide debug UI - User-facing issue |
| High | 3 | Error handling consistency - UX impact |
| Medium | 7 | Remove UI logic from apiService |
| Medium | 9 | Add shopping list item delete |
| Medium | 2 | File size refactoring |
| Low | 4-6, 8, 10-12 | Documentation and minor improvements |

---

## Positive Observations

- **Good test coverage**: 102 tests passing across 8 test files
- **Clear documentation**: CLAUDE.md provides excellent guidance for contributors
- **Consistent patterns**: Hooks follow similar structures, API routes are well-organized
- **Type safety**: Good use of TypeScript types throughout
- **Well-documented code**: Most files have clear header comments explaining purpose
- **Good schema design**: Prisma schema is well-indexed and uses appropriate relationships

---

*Generated by Claude Code Review*
