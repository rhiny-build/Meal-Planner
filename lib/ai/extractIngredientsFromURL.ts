/**
 * Extract ingredients from a recipe URL
 *
 * Takes a recipe URL and uses AI to:
 * 1. Fetch the page content
 * 2. Extract the ingredients list in structured format
 * 3. Extract the recipe name if possible
 */

import type { ExtractedRecipeData, StructuredIngredientData } from '@/types'
import { callForcedTool } from './claude'
import { AI_CONFIG, EXTRACT_HTML_MAX_LENGTH } from './config'
import { SYSTEM_PROMPTS, buildExtractIngredientsPrompt } from './prompts'
import { EXTRACT_RECIPE_SCHEMA } from './schemas'

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

    const prompt = buildExtractIngredientsPrompt(html.slice(0, EXTRACT_HTML_MAX_LENGTH))

    const parsed = await callForcedTool<{
      name?: string
      ingredients?: string
      structuredIngredients?: Array<{
        name: string
        quantity?: string | null
        unit?: string | null
        notes?: string | null
        order?: number
      }>
    }>({
      model: AI_CONFIG.extractIngredients.model,
      maxTokens: AI_CONFIG.extractIngredients.maxTokens,
      system: SYSTEM_PROMPTS.extractIngredients,
      prompt,
      toolName: 'record_recipe',
      toolDescription: 'Record the recipe name and ingredients extracted from the page.',
      schema: EXTRACT_RECIPE_SCHEMA,
    })

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
