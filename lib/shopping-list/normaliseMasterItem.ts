/**
 * Master item normalisation — LLM-based.
 *
 * Normalises user-entered master item names (e.g. "Sainsbury's Garlic Granules 100g")
 * into a canonical form (e.g. "garlic (dried)") that is stored as `normalisedName`
 * on MasterListItem and used to generate the embedding vector.
 *
 * Called on master item create/update only. Pure AI function — no DB access.
 *
 * For recipe ingredient normalisation (pipeline, transient), see
 * lib/normalisation/normaliseRecipeIngredient.ts.
 */

import { callForcedTool } from '../ai/claude'
import { AI_CONFIG } from '../ai/config'
import { SYSTEM_PROMPTS, buildNormaliseIngredientsPrompt } from '../ai/prompts'
import { NORMALISE_ITEMS_SCHEMA } from '../ai/schemas'

export type NormalisationInput = { id: string; name: string }
export type NormalisationResult = { id: string; baseIngredient: string; normalisedName?: string }

export async function normaliseMasterItems(
  items: NormalisationInput[]
): Promise<NormalisationResult[]> {
  if (items.length === 0) return []

  const itemsList = items
    .map((item) => `  { "id": "${item.id}", "name": "${item.name}" }`)
    .join(',\n')

  const prompt = buildNormaliseIngredientsPrompt(itemsList)

  const parsed = await callForcedTool<{ items: NormalisationResult[] }>({
    model: AI_CONFIG.normaliseIngredients.model,
    maxTokens: AI_CONFIG.normaliseIngredients.maxTokens,
    system: SYSTEM_PROMPTS.normaliseIngredients,
    prompt,
    toolName: 'record_normalised_items',
    toolDescription: 'Record the normalised base ingredient for each item.',
    schema: NORMALISE_ITEMS_SCHEMA,
  })

  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error('Unexpected AI response format: missing items array')
  }

  return parsed.items
}
