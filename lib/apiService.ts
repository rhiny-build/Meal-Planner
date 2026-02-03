/**
 * API Service
 *
 * Centralized API call utilities for the application.
 *
 * TODO: Split this file into separate modules (mealPlanApi.ts, recipeApi.ts, shoppingListApi.ts)
 * as it grows. Currently manageable but approaching the point where separation would help.
 */

import type { MealPlanWithRecipe, WeekPlan, RecipeWithIngredients } from '@/types'
import { toast } from 'sonner'


export const fetchMealPlan = async (startDate: Date, days: string[]): Promise<WeekPlan[]> => {
    const DAYS = days;
    let data: { mealPlans?: MealPlanWithRecipe[] } = { mealPlans: [] };

    try {
      const response = await fetch(
        `/api/meal-plan?startDate=${startDate.toISOString()}`
      )
      const json = await response.json()
      data = json ?? { mealPlans: [] }
    } 
    catch (error) {
      console.error('Error fetching meal plan:', error)
    }

    

    // Convert database meal plans to weekPlan format
    const plan: WeekPlan[] = DAYS.map((day, index) => {
        const date = new Date(startDate)
        date.setDate(date.getDate() + index)

        // Find meal plans for this day
        const dayMealPlans = (data.mealPlans || []).filter((mp: MealPlanWithRecipe) =>
            mp.dayOfWeek === day
        )

        // Find meal data - all columns are on the same meal plan record now
        const mealPlan = dayMealPlans[0]

        return {
            day,
            date,
            lunchRecipeId: mealPlan?.lunchRecipeId || '',
            proteinRecipeId: mealPlan?.proteinRecipeId || '',
            carbRecipeId: mealPlan?.carbRecipeId || '',
            vegetableRecipeId: mealPlan?.vegetableRecipeId || '',
            mealPlanId: mealPlan?.id
        }
    })

    return plan
}

export const fetchAllRecipes = async (): Promise<RecipeWithIngredients[]> => {

    try {
      const response = await fetch('/api/recipes')
      const json = await response.json()
      return json as RecipeWithIngredients[];
    }
    catch (error) {
      console.error('Error fetching recipes:', error)
      return []
    }
}

export const saveMealPlan = async (startDate: Date, weekPlan: WeekPlan[], days: string[]): Promise<WeekPlan[]> => {
try {
      // Transforming data from WeekPlan to API format
      const updates = weekPlan.map(weekDay => ({
            date: weekDay.date.toISOString(),
            dayOfWeek: weekDay.day,
            lunchRecipeId: weekDay.lunchRecipeId || null,
            proteinRecipeId: weekDay.proteinRecipeId || null,
            carbRecipeId: weekDay.carbRecipeId || null,
            vegetableRecipeId: weekDay.vegetableRecipeId || null
          }))
          
      

      // First delete existing meals for this week

      await fetch('/api/meal-plan/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: startDate.toISOString() }),
      })

      // Then create new meals
      const response = await fetch('/api/meal-plan/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: startDate.toISOString(), mealPlans: updates }),
      })

      if (response.ok) {
        toast.success('Meal plan saved!')
        const response = await fetchMealPlan(startDate, days)
        return response
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save meal plan')
        return []
      }
    } catch (error) {
      console.error('Error saving:', error)
      toast.error('Failed to save meal plan')
      return []
    }
}

// Shopping List API functions moved to server actions in app/shopping-list/actions.ts