/**
 * Normalise grocery product names to base ingredient concepts.
 *
 * Pure AI function — no DB access. Importable by server actions
 * and standalone scripts (e.g. backfill).
 */

import { openai, MODEL } from './client'
import { AI_CONFIG } from './config'
import { SYSTEM_PROMPTS, buildNormaliseIngredientsPrompt } from './prompts'

export type NormalisationInput = { id: string; name: string }
export type NormalisationResult = { id: string; baseIngredient: string }

export async function normaliseIngredients(
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
