/**
 * Generate a weekly meal plan
 *
 * Creates a 7-day meal plan following these rules:
 * - Weekdays (Mon-Thu): Quick/medium prep recipes
 * - Weekends (Fri-Sun): Any prep time, bias toward longer/new recipes
 * - Mix: Mostly favorites, 1-2 non-regular, max 1 new
 * - No consecutive same protein
 * - No consecutive same carb
 */

import type { Recipe } from '@/types'
import { openai, MODEL } from './client'

export async function generateWeeklyMealPlan(
  recipes: Recipe[],
  startDate: Date
): Promise<string[]> {
  try {
    // Format recipes for the AI
    const recipesText = recipes
      .map(
        r =>
          `ID: ${r.id}, Name: ${r.name}, Protein: ${r.proteinType}, Carb: ${r.carbType}, Prep: ${r.prepTime}, Tier: ${r.tier}`
      )
      .join('\n')

    const prompt = `You are a meal planning assistant. Generate a 7-day dinner meal plan starting from Monday.

Available recipes:
${recipesText}

Rules:
1. Monday-Thursday: Only quick or medium prep recipes
2. Friday-Sunday: Any prep time, prefer long prep and new recipes
3. Recipe tier distribution: Mostly favorites, 1-2 non-regular, max 1 new
4. No consecutive days with same protein type
5. No consecutive days with same carb type
6. Return exactly 7 recipe IDs in order (Monday to Sunday)

Return JSON with:
- "recipeIds": array of exactly 7 recipe IDs (strings) in order Mon-Sun
- "explanation": brief explanation of the choices`

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful meal planning assistant. Return your response as JSON.',
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
      recipeIds: string[]
      explanation: string
    }

    // Validate we got exactly 7 recipe IDs
    if (!parsed.recipeIds || parsed.recipeIds.length !== 7) {
      throw new Error('AI did not return exactly 7 recipes')
    }

    // Validate all recipe IDs exist
    const recipeIdSet = new Set(recipes.map(r => r.id))
    for (const id of parsed.recipeIds) {
      if (!recipeIdSet.has(id)) {
        throw new Error(`Invalid recipe ID returned: ${id}`)
      }
    }

    console.log('Generated meal plan:', parsed.explanation)
    return parsed.recipeIds
  } catch (error) {
    console.error('Error generating meal plan:', error)
    throw new Error('Failed to generate meal plan. Please try again.')
  }
}
