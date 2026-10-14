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
