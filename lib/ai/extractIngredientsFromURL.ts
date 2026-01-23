/**
 * Extract ingredients from a recipe URL
 *
 * Takes a recipe URL and uses AI to:
 * 1. Fetch the page content
 * 2. Extract the ingredients list in structured format
 * 3. Extract the recipe name if possible
 */

import type { ExtractedRecipeData, StructuredIngredientData } from '@/types'
import { openai, MODEL } from './client'

export async function extractIngredientsFromURL(
  url: string
): Promise<ExtractedRecipeData> {
  try {
    // Fetch the webpage content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MealPlannerBot/1.0)',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`)
    }

    const html = await response.text()

    const prompt = `Extract the recipe name and ingredients from this webpage HTML.

For each ingredient, parse it into structured format:
- name: the ingredient name (e.g., "chicken breast", "olive oil")
- quantity: the amount as a string (e.g., "2", "1/2", "500") - null if not specified
- unit: the unit of measurement (e.g., "cups", "grams", "tablespoons") - null if not specified
- notes: preparation notes (e.g., "diced", "optional", "for garnish") - null if none

Return JSON with:
- "name": the recipe name
- "ingredients": string with one ingredient per line (for backwards compatibility)
- "structuredIngredients": array of {name, quantity, unit, notes, order} objects

HTML content:
${html.slice(0, 15000)}`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that extracts recipe information from HTML. Return your response as JSON with "name", "ingredients", and "structuredIngredients" fields.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    })

    const result = completion.choices[0]?.message?.content
    if (!result) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(result) as {
      name?: string
      ingredients?: string
      structuredIngredients?: Array<{
        name: string
        quantity?: string | null
        unit?: string | null
        notes?: string | null
        order?: number
      }>
    }

    // Ensure order is set on structured ingredients
    const structuredIngredients: StructuredIngredientData[] = (
      parsed.structuredIngredients || []
    ).map((ing, index) => ({
      name: ing.name,
      quantity: ing.quantity || null,
      unit: ing.unit || null,
      notes: ing.notes || null,
      order: ing.order ?? index,
    }))

    // Generate ingredients string from structured if not provided
    const ingredientsText =
      parsed.ingredients ||
      structuredIngredients
        .map((ing) => {
          const parts = []
          if (ing.quantity) parts.push(ing.quantity)
          if (ing.unit) parts.push(ing.unit)
          parts.push(ing.name)
          if (ing.notes) parts.push(`(${ing.notes})`)
          return parts.join(' ')
        })
        .join('\n')

    return {
      name: parsed.name,
      ingredients: ingredientsText,
      structuredIngredients,
    }
  } catch (error) {
    console.error('Error extracting ingredients from URL:', error)
    throw new Error('Failed to extract recipe from URL. Please try again.')
  }
}
