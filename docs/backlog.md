# Backlog

## ~~Refactor: Split Large Shopping List Files~~ ✅ DONE

Completed in `feature_refactor_split_shopping_list` (merged to main).

- `actions.ts` split into `syncPipeline.ts`, `shoppingListActions.ts`, `masterListActions.ts`, `ingredientMappingActions.ts` + barrel re-export
- `ShoppingListClient.tsx` refactored into `useShoppingList` hook, `TabNavigation`, `ShoppingListTabContent` + thin orchestrator

---

## ~~P0: Shopping List Display Name Bug~~ ✅ RESOLVED

---

## ~~Configurable Week Start Day~~ ✅ DONE

Completed in `feature_configurable_week_start` (merged to main).

- Added `SystemSetting` model for app preferences
- Settings > Preferences tab with week start day picker (Sun–Sat)
- `dateUtils`, `mealPlanHelpers`, API routes, and client components all respect the setting
- Extracted `MealPlanClient` component from meal plan page


