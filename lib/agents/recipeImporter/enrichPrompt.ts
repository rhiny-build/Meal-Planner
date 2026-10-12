/**
 * Prompt pieces for the importer's ENRICH mode (S07 backfill).
 * Enrich mode = the recipe already exists in the book; the page may only add what is missing.
 */

/** The recipe already in the book, shown to the model in enrich mode. */
export interface EnrichContext {
  recipeId: string
  name: string
  servings: number | null
  totalTimeMinutes: number | null
  description: string | null
  notes: string | null
  hasSteps: boolean
  ingredients: { id: string; name: string; quantity: string | null; unit: string | null; notes: string | null }[]
}

/**
 * Extra rules appended to the normal importer prompt in enrich mode. We (not the model) decide
 * what gets written, and only into empty fields (lib/agents/recipeBackfill/enrich.ts). These
 * rules keep the model's draft easy to merge: same ingredient keys, no rewriting.
 */
export function buildEnrichSystemAddition(): string {
  return `

ENRICH MODE. The recipe is already in the family's book and you are only adding what it lacks from the page.
- You are given the book's current copy (name, servings, time, ingredients with ids). find_similar_recipes is not available.
- For every ingredient on the page that is the same as one in the book's list, use the book ingredient's id as its key (for example the key "cm1abc"), so steps point at the book's own ingredients. Give any ingredient that is not in the book's list a new key (n1, n2, ...).
- Do not rewrite names or quantities of ingredients that are in the book; the book's version always wins.
- Report servings, total time, description and notes only as the page states them; null when the page does not.
- The method must come from the page's own steps. If the page has no clear method, submit an EMPTY steps list.
- A one-line remark such as "combine and enjoy", "mix and serve" or "assemble" is NOT a method. Never turn it into a step, and never expand it into steps by adding ingredients or actions. A page with an ingredient list and no real instructions gets an empty steps list.
- If fetch_page fails (not found, blocked, login or payment wall), call cannot_import_recipe straight away with what went wrong. Do not retry or look for another URL.
- If the page is not a recipe, or is about a different dish than the book's recipe, call cannot_import_recipe.`
}

export function buildEnrichUserMessage(url: string, context: EnrichContext): string {
  const lines = context.ingredients.map(
    (i) => `- id ${i.id}: ${[i.quantity, i.unit, i.name].filter(Boolean).join(' ')}${i.notes ? ` (${i.notes})` : ''}`
  )
  return [
    `Enrich this existing recipe from its source page: ${url}`,
    '',
    `Book copy: "${context.name}"`,
    `servings: ${context.servings ?? 'not set'}; total time (min): ${context.totalTimeMinutes ?? 'not set'}; description: ${context.description ? 'set' : 'not set'}; notes: ${context.notes ? 'set' : 'not set'}; method: ${context.hasSteps ? 'already has steps' : 'no steps yet'}`,
    'Ingredients in the book:',
    ...(lines.length ? lines : ['(none)']),
  ].join('\n')
}
