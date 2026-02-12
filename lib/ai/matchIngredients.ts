/**
 * Match recipe ingredients against master list items using AI.
 *
 * Single AI call that receives both sides and determines which recipe
 * ingredients are already covered by staples/restock. More reliable than
 * independent normalisation + exact string matching because the AI can
 * reason about semantic equivalence (e.g. "mozzarella" ≈ "mozzarella cheese").
 */

import { openai, MODEL } from './client'
import { AI_CONFIG } from './config'
import { SYSTEM_PROMPTS, buildMatchIngredientsPrompt } from './prompts'

export type MatchInput = {
  recipeIngredients: string[]
  masterListBaseIngredients: string[]
}

export type MatchResultItem = {
  index: number
  name: string
  baseIngredient: string
  matchedMasterItem: string | null // null = needs buying, string = already covered
}

export async function matchIngredientsAgainstMasterList(
  input: MatchInput
): Promise<MatchResultItem[]> {
  if (input.recipeIngredients.length === 0) return []
  if (input.masterListBaseIngredients.length === 0) {
    return input.recipeIngredients.map((name, index) => ({
      index,
      name,
      baseIngredient: name.toLowerCase(),
      matchedMasterItem: null,
    }))
  }

  const recipeList = input.recipeIngredients
    .map((name, i) => `  ${i}: "${name}"`)
    .join('\n')

  const masterList = input.masterListBaseIngredients
    .map((name) => `  - "${name}"`)
    .join('\n')

  const prompt = buildMatchIngredientsPrompt(recipeList, masterList)

  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPTS.matchIngredients },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    ...AI_CONFIG.matchIngredients,
  })

  const result = completion.choices[0]?.message?.content
  if (!result) {
    throw new Error('No response from AI for ingredient matching')
  }

  const parsed = JSON.parse(result) as {
    items: Array<{ index: number; baseIngredient: string; matchedMasterItem: string | null }>
  }

  if (!parsed.items || !Array.isArray(parsed.items)) {
    throw new Error('Unexpected AI response format: missing items array')
  }

  return parsed.items.map((item) => ({
    index: item.index,
    name: input.recipeIngredients[item.index] ?? '',
    baseIngredient: item.baseIngredient,
    matchedMasterItem: item.matchedMasterItem,
  }))
}
