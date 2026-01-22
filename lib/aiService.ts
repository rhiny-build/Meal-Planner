/**
 * AI Service
 *
 * Handles all AI-powered operations:
 * - Meal plan generation (fills empty slots with AI suggestions)
 * - Recipe discovery (search web for new recipes via Perplexity)
 */

import type { WeekPlan, RecipeFormData } from '@/types'

// Type for recipe suggestions returned by discovery
export interface RecipeSuggestion extends RecipeFormData {
  recipeUrl: string
}

/**
 * Generates AI suggestions for empty slots in the meal plan
 *
 * @param startDate - The Monday of the week to generate for
 * @param currentPlan - The current week plan with any existing selections
 * @returns AI-generated meal plan suggestions (caller merges with existing selections)
 */
export const generateMealPlan = async (
  startDate: Date,
  currentPlan: WeekPlan[]
): Promise<WeekPlan[]> => {
  try {
    const response = await fetch('/api/meal-plan/modify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: startDate.toISOString(),
        currentPlan: currentPlan,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to generate meal plan')
    }

    const data = await response.json()
    return data.mealPlans || []
  } catch (error) {
    console.error('Error generating meal plan:', error)
    throw error
  }
}

/**
 * Searches for recipe suggestions based on user prompt
 *
 * @param prompt - User's natural language request (e.g., "quick chicken dinners")
 * @returns Array of recipe suggestions with all fields populated
 */
export const discoverRecipes = async (
  prompt: string
): Promise<RecipeSuggestion[]> => {
  try {
    const response = await fetch('/api/recipes/discover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to discover recipes')
    }

    const data = await response.json()
    return data.recipes || []
  } catch (error) {
    console.error('Error discovering recipes:', error)
    throw error
  }
}
