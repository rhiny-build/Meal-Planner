/**
 * Modify a meal plan based on natural language instructions
 *
 * Takes a user instruction like "swap Tuesday for something faster" and:
 * 1. Understands what change is requested
 * 2. Finds a suitable recipe from the available recipes
 * 3. Returns the modified plan
 */

import type {
  MealPlanModificationRequest,
  MealPlanModificationResult,
} from '@/types'
import { openai, MODEL } from './client'

export async function modifyMealPlan(
  request: MealPlanModificationRequest
): Promise<MealPlanModificationResult> {
  try {
    // Format current plan for the AI
    const currentPlanText = request.currentPlan
      .map(
        mp =>
          `${mp.dayOfWeek} (${mp.date.toLocaleDateString()}): 
      - Protein: ${mp.proteinRecipe?.name} (${mp.proteinRecipe?.proteinType}, ${mp.proteinRecipe?.prepTime})
       - Carb: ${mp.carbRecipe?.name}, (${mp.carbRecipe?.carbType}, ${mp.carbRecipe?.prepTime})`
      )
      .join('\n')

    // Format available recipes for the AI
    const recipesText = request.availableRecipes
      .map(
        r =>
          `ID: ${r.id}, Name: ${r.name}, Protein: ${r.proteinType}, Carb: ${r.carbType}, Prep: ${r.prepTime}, Tier: ${r.tier}`
      )
      .join('\n')

    const prompt = `You are a meal planning assistant. Modify the weekly meal plan based on the user's instruction.

Current meal plan:
${currentPlanText}

Available recipes:
${recipesText}

User instruction: "${request.instruction}"

Rules to follow:
- Weekdays (Mon-Thu) should be quick/medium prep
- Weekends (Fri-Sun) can be any prep time
- Don't repeat same protein on consecutive days
- Don't repeat same carb on consecutive days
- Prefer favorite tier recipes, some regular, rarely non-regular

Return JSON with:
- "modifiedPlan": array of {date: ISO date string, proteinRecipeId: string, carbRecipeId: string} for changed meals only
- "explanation": string explaining what you changed and why`

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
      modifiedPlan: { date: string; proteinRecipeId: string; carbRecipeId: string }[]
      explanation: string
    }

    // Convert date strings back to Date objects
    return {
      modifiedPlan: parsed.modifiedPlan.map(mp => ({
        date: new Date(mp.date),
        proteinRecipeId: mp.proteinRecipeId,
        carbRecipeId: mp.carbRecipeId,
      })),
      explanation: parsed.explanation,
    }
  } catch (error) {
    console.error('Error modifying meal plan:', error)
    throw new Error('Failed to modify meal plan. Please try again.')
  }
}
