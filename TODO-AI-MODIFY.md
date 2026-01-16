# AI Modify Meal Plan - Work In Progress

## Summary
Updating the `modifyMealPlan` AI feature to support the new separate protein/carb recipe structure (instead of single recipe per meal).

## What's Done
1. **lib/ai/modifyMealPlan.ts** - Updated to:
   - Format meal plan with separate protein and carb recipes in the prompt
   - Ask AI to return `proteinRecipeId` and `carbRecipeId` instead of single `recipeId`
   - Parse and return the new structure

2. **types/index.ts** - Updated `MealPlanModificationResult` to use `proteinRecipeId` and `carbRecipeId`

3. **app/api/meal-plan/modify/route.ts** - Updated to:
   - Include `proteinRecipe` and `carbRecipe` in Prisma queries
   - Update both recipe IDs when applying modifications

4. **app/meal-plan/page.tsx** - Started implementing `handleGenerate`:
   - Saves meal plan first to get IDs
   - Calls `/api/meal-plan/modify` with IDs and hardcoded instruction
   - Still has TypeScript errors to resolve

## What's Left
1. Fix TypeScript errors in `page.tsx` (check what `saveMealPlan` returns)
2. Test the full flow: button click → save → AI modify → refresh
3. Add user input field for custom instructions (todo noted in MealPlanHeader)

## Files Changed
- `lib/ai/modifyMealPlan.ts`
- `types/index.ts`
- `app/api/meal-plan/modify/route.ts`
- `app/meal-plan/page.tsx`

## Current Errors
Check `app/meal-plan/page.tsx` - likely type mismatch between what `saveMealPlan` returns and what we're mapping.
