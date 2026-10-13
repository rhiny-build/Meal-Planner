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
import { callForcedTool } from './claude'
import { AI_CONFIG } from './config'
import { SYSTEM_PROMPTS, buildModifyMealPlanPrompt } from './prompts'
import { MODIFY_MEAL_PLAN_SCHEMA } from './schemas'
import { alignModifiedPlan } from './alignMealPlan'

export async function modifyMealPlan(
  request: MealPlanModificationRequest
): Promise<MealPlanModificationResult> {
  try {
    // Format current plan for the AI
    const currentPlanText = request.currentPlan
      .map(
        mp =>
          `${mp.dayOfWeek} (${mp.date}):
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

    const parsed = await callForcedTool<{
      modifiedPlan: { date: string; lunchRecipeId: string; proteinRecipeId: string; carbRecipeId: string; vegetableRecipeId: string }[]
      explanation: string
    }>({
      model: AI_CONFIG.modifyMealPlan.model,
      maxTokens: AI_CONFIG.modifyMealPlan.maxTokens,
      system: SYSTEM_PROMPTS.modifyMealPlan,
      prompt,
      toolName: 'submit_meal_plan',
      toolDescription: 'Submit the complete modified weekly meal plan.',
      schema: MODIFY_MEAL_PLAN_SCHEMA,
    })

    // One entry per day we sent, dated as we sent it, with every recipe id checked
    // (the model's date labels and ids are not trusted as they come).
    return {
      modifiedPlan: alignModifiedPlan(
        request.currentPlan,
        parsed.modifiedPlan ?? [],
        request.availableRecipes
      ),
      explanation: parsed.explanation,
    }
  } catch (error) {
    console.error('Error modifying meal plan:', error)
    throw new Error('Failed to modify meal plan. Please try again.')
  }
}
