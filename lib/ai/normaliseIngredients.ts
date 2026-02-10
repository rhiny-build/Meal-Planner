/**
 * Normalise grocery product names to base ingredient concepts.
 *
 * Pure AI function — no DB access. Importable by server actions
 * and standalone scripts (e.g. backfill).
 */

import { openai, MODEL } from './client'

export type NormalisationInput = { id: string; name: string }
export type NormalisationResult = { id: string; baseIngredient: string }

export async function normaliseIngredients(
  items: NormalisationInput[]
): Promise<NormalisationResult[]> {
  if (items.length === 0) return []

  const itemsList = items
    .map((item) => `  { "id": "${item.id}", "name": "${item.name}" }`)
    .join(',\n')

  const prompt = `Normalise these grocery product names to their base ingredient concept.

Items:
[
${itemsList}
]

Rules:
- STRIP: brand names (Sainsbury's, Warburtons, Müller), quantities and weights (325g, x5, 1kg, 2L), generic quality descriptors (fresh, organic, large, free range), preparation words that don't change the product (sliced, grated, pre-sliced)
- KEEP: descriptors that distinguish the product type (baby plum vs salad, red vs white, smoked vs unsmoked), specific product variants that matter for cooking (garlic granules ≠ garlic), compound names where both words matter (spring onions, pine nuts, soy sauce)

Return lowercase base ingredient names.

Return JSON: { "items": [{ "id": "...", "baseIngredient": "..." }] }`

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful assistant that normalises grocery product names to their base ingredient concept. Always return valid JSON.',
      },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
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
