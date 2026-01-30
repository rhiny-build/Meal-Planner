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
      - Lunch: ${mp.lunchRecipe?.name || 'none'}
      - Protein: ${mp.proteinRecipe?.name || 'none'} (${mp.proteinRecipe?.proteinType}, ${mp.proteinRecipe?.prepTime})
      - Carb: ${mp.carbRecipe?.name || 'none'} (${mp.carbRecipe?.carbType}, ${mp.carbRecipe?.prepTime})
      - Vegetable: ${mp.vegetableRecipe?.name || 'none'}`
      )
      .join('\n')

    // Format available recipes for the AI
    const recipesText = request.availableRecipes
      .map(
        r =>
          `ID: ${r.id}, Name: ${r.name}, Protein: ${r.proteinType || 'none'}, Carb: ${r.carbType || 'none'}, Vegetable: ${r.vegetableType ? 'yes' : 'no'}, Prep: ${r.prepTime}, Tier: ${r.tier}, LunchAppropriate: ${r.isLunchAppropriate ? 'yes' : 'no'}`
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
- NEVER repeat same protein on consecutive days. For example, two dishes that contain Rice should not be on back-to-back days. 
If a plan has the same protein on two consecutive days, change the second day's protein or leave it empty if no suitable replacement is found.
- NEVERrepeat same carb on consecutive days. For example, two dishes that contain Chicken should not be on back-to-back days. 
If a plan has the same carb on two consecutive days, change the second day's carb or leave it empty if no suitable replacement is found.
- Never repeat the same recipe within the week
- Aim for balanced protein and carb distribution
- Use only the available recipes provided
- For any new recipes selected, provide their IDs from the available recipes
- Prefer favorite tier recipes, some regular, rarely non-regular
- A parital plan that follows the rules is absolutely acceptable. A full plan that breaks the rules is not and you would have failed in your task.

Return JSON with:
- "modifiedPlan": array of {date: ISO date string, lunchRecipeId: string, proteinRecipeId: string, carbRecipeId: string, vegetableRecipeId: string} for changed meals only
- "explanation": string explaining what you changed and why`

console.log('Modification prompt:', prompt)

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
      modifiedPlan: { date: string; lunchRecipeId: string; proteinRecipeId: string; carbRecipeId: string; vegetableRecipeId: string }[]
      explanation: string
    }

    // Convert date strings back to Date objects
    return {
      modifiedPlan: parsed.modifiedPlan.map(mp => ({
        date: new Date(mp.date),
        lunchRecipeId: mp.lunchRecipeId || '',
        proteinRecipeId: mp.proteinRecipeId,
        carbRecipeId: mp.carbRecipeId,
        vegetableRecipeId: mp.vegetableRecipeId,
      })),
      explanation: parsed.explanation,
    }
  } catch (error) {
    console.error('Error modifying meal plan:', error)
    throw new Error('Failed to modify meal plan. Please try again.')
  }
}
