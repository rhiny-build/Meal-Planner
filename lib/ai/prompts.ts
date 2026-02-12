/**
 * AI Prompt Templates
 *
 * Separated from business logic so prompts can be iterated on
 * without risking changes to data processing or response handling.
 *
 * Each function takes pre-formatted data and returns the prompt string.
 * The JSON contract (what shape the AI must return) is documented inline.
 */

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPTS = {
  modifyMealPlan:
    'You are a helpful meal planning assistant. Return your response as JSON.',
  normaliseIngredients:
    'You are a helpful assistant that normalises grocery product names to their base ingredient concept. Always return valid JSON.',
  matchIngredients:
    'You are a helpful assistant that matches recipe ingredients against household inventory. Always return valid JSON.',
  extractIngredients:
    'You are a helpful assistant that extracts recipe information from HTML. Return your response as JSON with "name", "ingredients", and "structuredIngredients" fields.',
} as const

// ---------------------------------------------------------------------------
// User prompt builders
// ---------------------------------------------------------------------------

/**
 * Build the prompt for modifying / generating a weekly meal plan.
 *
 * Expected JSON response shape:
 * {
 *   modifiedPlan: { date: string, lunchRecipeId: string, proteinRecipeId: string, carbRecipeId: string, vegetableRecipeId: string }[]
 *   explanation: string
 * }
 */
export function buildModifyMealPlanPrompt(params: {
  currentPlanText: string
  lunchRecipes: string
  proteinRecipes: string
  carbRecipes: string
  vegetableRecipes: string
  instruction: string
}): string {
  return `You are a meal planning assistant.

Your task is to generate a COMPLETE weekly meal plan with ALL 28 slots filled.

IMPORTANT RULES:

1) The weekly plan has 7 days × 4 slots per day:
   - lunch
   - protein
   - carb
   - vegetable

2) Some slots in the current plan already have a recipe name.
   These are LOCKED and MUST NOT be changed.
   - If a slot contains a recipe name → keep it exactly as is.

3) You MUST fill every empty slot using ONLY recipes from the available recipes list.

4) No recipe may appear more than once in the entire week. Locked meals are automatically considered "used" and do not count as repetition.

5) Maintain a "used recipe ID list" as you fill the plan:
   - Initialize it with the IDs of all locked meals.
   - For each empty slot:
     1) Pick a recipe ID that is NOT in the used list.
     2) Assign it to the slot.
     3) Add the recipe ID to the used list.
   - Repeat until all empty slots are filled.

6) Each slot MUST use a recipe from that slot's list below. A recipe not in the list is INVALID for that slot.
7) If multiple valid recipes are available for a slot, prioritize variety over tier or prep time.


Current meal plan:
${params.currentPlanText}

Available LUNCH recipes (use ONLY these for lunch slots):
${params.lunchRecipes}

Available PROTEIN recipes (use ONLY these for protein slots):
${params.proteinRecipes}

Available CARB recipes (use ONLY these for carb slots):
${params.carbRecipes}

Available VEGETABLE recipes (use ONLY these for vegetable slots):
${params.vegetableRecipes}

User instruction: "${params.instruction}"


Return JSON with:
- "modifiedPlan": array of {date: ISO date string, lunchRecipeId: string, proteinRecipeId: string, carbRecipeId: string, vegetableRecipeId: string} for ALL days in the plan
-  "explanation": "Explain briefly how you ensured all slots were filled and locked meals preserved."
}

CRITICAL:
- Return ALL 7 days.
- Every slot must contain a valid recipe ID.
- Do not leave any slot empty.`
}

/**
 * Build the prompt for normalising grocery product names.
 *
 * Expected JSON response shape:
 * { items: { id: string, baseIngredient: string }[] }
 */
export function buildNormaliseIngredientsPrompt(itemsList: string): string {
  return `Normalise these grocery product names to their base ingredient concept.

Items:
[
${itemsList}
]

Rules:
- STRIP: brand names (Sainsbury's, Warburtons, Müller), quantities and weights (325g, x5, 1kg, 2L), generic quality descriptors (fresh, organic, large, free range), preparation words that don't change the product (sliced, grated, pre-sliced), instructions (any fresh pasta = pasta, chopped tomatoes = tomatoes), and any other words that don't change the core ingredient (e.g. "bag of salad" = "salad", "bunch of spring onions" = "spring onions")
- KEEP: descriptors that distinguish the product type (baby plum vs salad, red vs white, smoked vs unsmoked), specific product variants that matter for cooking (garlic granules ≠ garlic), compound names where both words matter (spring onions, pine nuts, soy sauce)

Return lowercase base ingredient names.

Return JSON: { "items": [{ "id": "...", "baseIngredient": "..." }] }`
}

/**
 * Build the prompt for matching recipe ingredients against master list items.
 *
 * Expected JSON response shape:
 * { items: { index: number, baseIngredient: string, matchedMasterItem: string | null }[] }
 */
export function buildMatchIngredientsPrompt(
  recipeList: string,
  masterList: string,
): string {
  return `You are helping filter a shopping list. The user has these items at home (staples/restock). Recipe ingredients that are covered by an item at home should be excluded from the shopping list.

RECIPE INGREDIENTS (from this week's meals):
${recipeList}

ITEMS ALREADY AT HOME (base ingredient names):
${masterList}

For each recipe ingredient, determine:
1. Its base ingredient concept (lowercase, stripped of quantities/prep words)
2. Whether it matches any item at home. Use SEMANTIC matching — "mozzarella" matches "mozzarella cheese", "rice" matches "basmati rice", "pepper" matches "red pepper", etc. But keep meaningful distinctions: "garlic" does NOT match "garlic granules" (different products).

Return JSON: { "items": [{ "index": 0, "baseIngredient": "...", "matchedMasterItem": "..." or null }] }

Set matchedMasterItem to the matched home item string if covered, or null if the user needs to buy it.`
}

/**
 * Build the prompt for extracting ingredients from recipe page HTML.
 *
 * Expected JSON response shape:
 * { name: string, ingredients: string, structuredIngredients: { name, quantity, unit, notes, order }[] }
 */
export function buildExtractIngredientsPrompt(html: string): string {
  return `Extract the recipe name and ingredients from this webpage HTML.

For each ingredient, parse it into structured format:
- name: the ingredient name only (e.g., "chicken breast", "olive oil") - do NOT include quantities or units in the name
- quantity: the amount as a string (e.g., "2", "1/2", "500") - null if not specified
- unit: the unit of measurement in METRIC units (convert imperial to metric):
  - Use "g" or "kg" for weight (not lb, oz)
  - Use "ml" or "L" for liquids (not cups, fl oz)
  - Keep tbsp/tsp for small amounts
  - Keep countable units (cloves, bunches, etc.)
- notes: preparation notes (e.g., "diced", "optional", "for garnish") - null if none

Return JSON with:
- "name": the recipe name
- "ingredients": string with one ingredient per line (for backwards compatibility)
- "structuredIngredients": array of {name, quantity, unit, notes, order} objects

HTML content:
${html}`
}
