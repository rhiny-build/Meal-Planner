/**
 * Extract ingredients from a recipe URL
 *
 * Takes a recipe URL and uses AI to:
 * 1. Fetch the page content
 * 2. Extract the ingredients list
 * 3. Extract the recipe name if possible
 */

import type { ExtractedRecipeData } from '@/types'
import { openai, MODEL } from './client'

export async function extractIngredientsFromURL(
  url: string
): Promise<ExtractedRecipeData> {
  try {
    // Note: For production, you'd want to fetch the URL content server-side
    // and pass it to the AI. For now, we'll ask the AI to describe what it would do.
    const prompt = `You are a recipe extraction assistant. Given a recipe URL, extract the ingredients list and recipe name.

URL: ${url}

Since you cannot fetch URLs directly, I need you to:
1. Tell the user they need to paste the recipe content
2. Explain what ingredients format you're expecting

For now, return a helpful message in the ingredients field.`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that extracts recipe information from URLs. Return your response as JSON with "ingredients" and "name" fields.',
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
    console.error('Error extracting ingredients from URL:', error)
    throw new Error('Failed to extract recipe from URL. Please try again.')
  }
}
