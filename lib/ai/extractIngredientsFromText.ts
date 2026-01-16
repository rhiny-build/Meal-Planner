/**
 * Extract ingredients from pasted recipe text
 *
 * Takes raw recipe text (pasted by user) and extracts just the ingredients
 * in a clean, formatted list.
 */

import type { ExtractedRecipeData } from '@/types'
import { openai, MODEL } from './client'

export async function extractIngredientsFromText(
  recipeText: string
): Promise<ExtractedRecipeData> {
  try {
    const prompt = `Extract the ingredients list from this recipe text. Format as a clean list, one ingredient per line.

Recipe text:
${recipeText}

Return JSON with:
- "ingredients": string with one ingredient per line
- "name": the recipe name if you can find it`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that extracts ingredients from recipe text. Return clean, formatted ingredients. Return your response as JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    })

    const result = completion.choices[0]?.message?.content
    if (!result) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(result) as ExtractedRecipeData
    return parsed
  } catch (error) {
    console.error('Error extracting ingredients from text:', error)
    throw new Error('Failed to extract ingredients. Please try again.')
  }
}
