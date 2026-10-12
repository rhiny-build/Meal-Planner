# S06 — MCP upgrade for recipe discovery from Claude.ai

Wave 3 · Schema: no · Depends on: S03 · Can run alongside: S04, S05

Read `docs/rehaul/sessions/_common.md`, `docs/Specs/MCP.md` and the S03 log first.

## Goal
Discovery Phase A (D4). In Claude.ai, Ronen asks for a recipe, cooks it in Claude's cook-now view if he wants, and says "save it". It lands in the book with method, servings and kind. Claude can also read and update existing recipes, for example to add a method to a family recipe after describing it.

## Current state
`lib/mcp/server.ts` registers `get_meal_plan`, `get_shopping_history`, `get_recipes` and `create_recipe` (`lib/mcp/tools/`). `create_recipe` takes name, ingredients (name + quantity string) and metadata only. The server is live in production at `app/api/mcp/route.ts`.

## Scope
1. **`create_recipe`**: accept `kind`, `servings`, `description`, `totalTimeMinutes`, `notes`, `steps` (text + optional timer) and structured ingredients (name, amount, unit, quantity text, notes). Steps can reference ingredients by their position in the submitted list; the server converts those references to `{ing:<id>}` tokens after creating the ingredients. All new fields are optional (D3). Stay backward compatible with the old shape.
2. **`get_recipe(id)`**: one recipe in full, including steps.
3. **`update_recipe(id, …)`**: patch fields, replace steps, replace ingredients. The tool description must say to call it only after the user confirms.
4. **`get_recipes`**: include `kind`, and whether a method exists, in the summary output. Don't return full steps for every recipe; that's what `get_recipe` is for.
5. Write tool descriptions for the model that will read them: when to use each one, and what "confirmed" means.
6. Tests for each tool handler.

## Out of scope
Meal-plan tools (S13). In-app discovery (S10).

## Done when
After deploy, from Claude.ai: ask for a recipe, save it, see it in the app with steps and servings. Then describe a family recipe (e.g. one of the Shini's dishes) and have Claude add its method via `update_recipe`. Ronen does this end-to-end check after merge, so leave him the exact test script in your log.

## Walkthrough focus
How an MCP tool description shapes when Claude calls it, and the step-reference conversion.
