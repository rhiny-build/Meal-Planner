# S04 — Recipe book UI

Wave 3 · Schema: no · Depends on: S03 · Can run alongside: S05, S06

Read `docs/rehaul/sessions/_common.md`, the repo skill `ui`, and the S03 log first. Use `frontend-design` for visual direction.

## Goal
The recipes area becomes a recipe *book*. You can browse it, open a recipe, read its ingredients and method (if there is one), and edit it, including marking it full or quick.

## Current state
`app/recipes/` has a list with filters (`RecipesClient`, `RecipeFilters`), `RecipeModal`, `RecipeForm`, `RecipeCard`, and `InspireModal`. Recipes are edited in a modal.

## Scope
1. **Book view**: browse with the existing filters, plus a full/quick filter. Quick items are visually compact. Full recipes with a method are visibly distinct from those without; a small indicator is enough, not a nag.
2. **Recipe page** `app/recipes/[id]`: name, description, servings, time, ingredients (amount + unit when present, free text otherwise), method steps with ingredient tokens rendered (S03 helper), notes, source link. A recipe with no method shows nothing in that section, or a quiet "No method yet". It is never an error and never a prompt to fill it in (D3).
3. **Editing**: ingredients, steps (add, remove, reorder, optional timer per step), kind, servings, notes. Decide with Ronen whether editing stays a modal or moves to the page.
4. Keep the existing "add recipe from URL" entry point working (it will be replaced by the S05 importer). Don't build import here.
5. Leave a clearly marked placeholder for the "Cook" button that S08 will wire up. Don't build cook mode.

## Out of scope
Import and agents (S05), cook mode (S08), MCP (S06).

## Done when
Ronen can open Beef Keema with Peas, see its ingredients, add three method steps with a timer on one, mark Simple Fries as quick, and find both via the filters. Validated with Playwright on desktop and phone width. Tests pass.

## Walkthrough focus
The component breakdown (which component owns what), and how a step's ingredient token becomes rendered text.
