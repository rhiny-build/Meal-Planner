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

import { openai, MODEL } from '../ai/client'
import { AI_CONFIG } from '../ai/config'
import { SYSTEM_PROMPTS, buildNormaliseIngredientsPrompt } from '../ai/prompts'

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

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPTS.normaliseIngredients },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    ...AI_CONFIG.normaliseIngredients,
  })

  const result = completion.choices[0]?.message?.content
  if (!result) {
    throw new Error('No response from AI for ingredient normalisation')
  }

  const parsed = JSON.parse(result) as { items: NormalisationResult[] }

  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error('Unexpected AI response format: missing items array')
  }

  return parsed.items
}
