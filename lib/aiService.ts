/**
 * AI Service
 *
 * Handles all AI-powered operations:
 * - Meal plan generation (fills empty slots with AI suggestions)
 * - Recipe discovery and extraction (future)
 */

import type { WeekPlan } from '@/types'

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
