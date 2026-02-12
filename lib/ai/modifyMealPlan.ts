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
import { AI_CONFIG } from './config'
import { SYSTEM_PROMPTS, buildModifyMealPlanPrompt } from './prompts'

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

    // Group available recipes by slot type so the AI can only pick valid ones
    const formatRecipe = (r: typeof request.availableRecipes[0]) =>
      `ID: ${r.id}, Name: ${r.name}, Prep: ${r.prepTime}, Tier: ${r.tier}`

    const lunchRecipes = request.availableRecipes.filter(r => r.isLunchAppropriate).map(formatRecipe).join('\n')
    const proteinRecipes = request.availableRecipes.filter(r => r.proteinType).map(formatRecipe).join('\n')
    const carbRecipes = request.availableRecipes.filter(r => r.carbType).map(formatRecipe).join('\n')
    const vegetableRecipes = request.availableRecipes.filter(r => r.vegetableType).map(formatRecipe).join('\n')

    const prompt = buildModifyMealPlanPrompt({
      currentPlanText,
      lunchRecipes,
      proteinRecipes,
      carbRecipes,
      vegetableRecipes,
      instruction: request.instruction,
    })

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS.modifyMealPlan },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      ...AI_CONFIG.modifyMealPlan,
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
