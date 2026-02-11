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

    // Group available recipes by slot type so the AI can only pick valid ones
    const formatRecipe = (r: typeof request.availableRecipes[0]) =>
      `ID: ${r.id}, Name: ${r.name}, Prep: ${r.prepTime}, Tier: ${r.tier}`

    const lunchRecipes = request.availableRecipes.filter(r => r.isLunchAppropriate).map(formatRecipe).join('\n')
    const proteinRecipes = request.availableRecipes.filter(r => r.proteinType).map(formatRecipe).join('\n')
    const carbRecipes = request.availableRecipes.filter(r => r.carbType).map(formatRecipe).join('\n')
    const vegetableRecipes = request.availableRecipes.filter(r => r.vegetableType).map(formatRecipe).join('\n')

    const prompt = `You are a meal planning assistant.

Your task is to generate a COMPLETE weekly meal plan with ALL 28 slots filled.

IMPORTANT RULES:

1) The weekly plan has 7 days × 4 slots per day:
   - lunch
   - protein
   - carb
   - vegetable

2) Some slots in the current plan already have a recipe name.
   These are LOCKED and MUST NOT be changed.
   - If a slot contains a recipe name → keep it exactly as is.

3) You MUST fill every empty slot using ONLY recipes from the available recipes list.

4) No recipe may appear more than once in the entire week. Locked meals are automatically considered “used” and do not count as repetition.

5) Maintain a "used recipe ID list" as you fill the plan:
   - Initialize it with the IDs of all locked meals.
   - For each empty slot:
     1) Pick a recipe ID that is NOT in the used list.
     2) Assign it to the slot.
     3) Add the recipe ID to the used list.
   - Repeat until all empty slots are filled.

6) Each slot MUST use a recipe from that slot's list below. A recipe not in the list is INVALID for that slot.
7) If multiple valid recipes are available for a slot, prioritize variety over tier or prep time.


Current meal plan:
${currentPlanText}

Available LUNCH recipes (use ONLY these for lunch slots):
${lunchRecipes}

Available PROTEIN recipes (use ONLY these for protein slots):
${proteinRecipes}

Available CARB recipes (use ONLY these for carb slots):
${carbRecipes}

Available VEGETABLE recipes (use ONLY these for vegetable slots):
${vegetableRecipes}

User instruction: "${request.instruction}"


Return JSON with:
- "modifiedPlan": array of {date: ISO date string, lunchRecipeId: string, lunchRecipeName: string, proteinRecipeId: string, proteinRecipeName: string, carbRecipeId: string, carbRecipeName: string, vegetableRecipeId: string, vegetableRecipeName: string} for ALL days in the plan
-  "explanation": "Explain briefly how you ensured all slots were filled and locked meals preserved."
}

CRITICAL:
- Return ALL 7 days.
- Every slot must contain a valid recipe ID.
- Do not leave any slot empty.`

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
      max_completion_tokens: 4000,
      temperature: 0.2, // low temperature for more deterministic output
    })

    const result = completion.choices[0]?.message?.content
    if (!result) {
      throw new Error('No response from AI')
    }

    const parsed = JSON.parse(result) as {
      modifiedPlan: { date: string; lunchRecipeId: string; lunchRecipeName: string; proteinRecipeId: string; proteinRecipeName: string; carbRecipeId: string; carbRecipeName: string; vegetableRecipeId: string; vegetableRecipeName: string }[]
      explanation: string
    }

    console.log('AI modified plan response:', JSON.stringify(parsed.modifiedPlan, null, 2))

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

/*
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

*/