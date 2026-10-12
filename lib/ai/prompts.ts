/**
 * AI Prompt Templates
 *
 * Separated from business logic so prompts can be iterated on
 * without risking changes to data processing or response handling.
 *
 * Each function takes pre-formatted data and returns the prompt string.
 * The result shape is defined by the tool schemas in lib/ai/schemas.ts.
 */

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

export const SYSTEM_PROMPTS = {
  modifyMealPlan:
    'You are a helpful meal planning assistant. Submit your answer using the provided tool.',
  normaliseIngredients:
    'You are a helpful assistant that normalises grocery product names to their base ingredient concept. Submit your answer using the provided tool.',
  normaliseIngredientSingle: `You are an expert chef and recipe analyst. Your job is to normalise ingredient names to canonical British English form for use in a shopping list deduplication system.

Instructions:
- Resolve synonyms to British English (scallion → spring onion, zucchini → courgette, cilantro → coriander, eggplant → aubergine)
- Identify the base ingredient and any meaningful form qualifier (fresh, dried, tinned, frozen, ground, smoked, pickled, paste)
- Ignore preference/quality markers that don't affect shopping (free range, organic, sea, baby)
- Preserve variety qualifiers that affect the recipe (cherry tomato, new potato, button mushroom)
- Submit your answer using the provided tool

Example: "scallions" -> canonical "spring onion (fresh)", base "spring onion", form "fresh".
If there is no meaningful form qualifier, set "form" to null and omit the parenthetical from "canonical": "butter" -> canonical "butter", base "butter", form null.`,
  discoverRecipes: `You are a recipe discovery assistant. Search the web for real recipes matching the user's request, then call submit_recipes ONCE with exactly 3 recipes.

For each recipe:
- name: Recipe name
- recipeUrl: Direct URL to the recipe page (must be a real URL you found via search)
- ingredients: List of ingredients, one per line
- proteinType: One of chicken, fish, red-meat, vegetarian (null if not applicable)
- carbType: One of rice, pasta, couscous, fries, other (null if not applicable)
- prepTime: quick (<30min), medium (30-60min) or long (>60min)
- tier: always "new"`,
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


Submit with the tool:
- "modifiedPlan": array of {date: ISO date string, lunchRecipeId, proteinRecipeId, carbRecipeId, vegetableRecipeId} for ALL days in the plan
- "explanation": explain briefly how you ensured all slots were filled and locked meals preserved.

CRITICAL:
- Return ALL 7 days.
- Every slot must contain a valid recipe ID.
- Do not leave any slot empty.`
}

/**
 * Build the prompt for normalising grocery product names.
 *
 * Expected JSON response shape:
 * { items: { id: string, baseIngredient: string, canonicalName: string }[] }
 * Note: LLM returns `canonicalName` — mapped to `normalisedName` in calling code.
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

Also provide a canonicalName for each item: the base ingredient with its form in parentheses if relevant.
Forms: fresh, dried, ground, tinned, frozen, smoked, pickled, paste, flaked.
Examples: "tomatoes (tinned)", "garlic (fresh)", "cumin (ground)", "salmon (smoked)", "eggs", "spring onions".
If no specific form applies, canonicalName equals baseIngredient.

Submit one entry per item with the tool (id, baseIngredient, canonicalName).`
}
