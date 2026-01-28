/**
 * API Service
 *
 * Centralized API call utilities for the application.
 *
 * TODO: Split this file into separate modules (mealPlanApi.ts, recipeApi.ts, shoppingListApi.ts)
 * as it grows. Currently manageable but approaching the point where separation would help.
 */

import type { MealPlanWithRecipe, WeekPlan, Recipe, ShoppingListWithItems, ShoppingListItem } from '@/types'


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

        // Separate protein, carb, and vegetable
        const proteinMeal = dayMealPlans.find((mp: MealPlanWithRecipe) =>
            mp.proteinRecipeId
        )
        const carbMeal = dayMealPlans.find((mp: MealPlanWithRecipe) =>
            mp.carbRecipe
        )
        const vegetableMeal = dayMealPlans.find((mp: MealPlanWithRecipe) =>
            mp.vegetableRecipeId
        )

        return {
            day,
            date,
            proteinRecipeId: proteinMeal?.proteinRecipeId || '',
            carbRecipeId: carbMeal?.carbRecipeId || '',
            vegetableRecipeId: vegetableMeal?.vegetableRecipeId || '',
            mealPlanId: proteinMeal?.id || carbMeal?.id || vegetableMeal?.id
        }
    })

    return plan
}

export const fetchAllRecipes = async (): Promise<Recipe[]> => {
    
    try {
      const response = await fetch('/api/recipes')
      const json = await response.json()
      return json as Recipe[];
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
        alert('Meal plan saved!')
        const response = await fetchMealPlan(startDate, days)
        return response
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save meal plan')
        return []
      }
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save meal plan')
      return []
    }
}

// Shopping List API functions

export const fetchShoppingList = async (weekStart: Date): Promise<ShoppingListWithItems | null> => {
  try {
    const response = await fetch(
      `/api/shopping-list?weekStart=${weekStart.toISOString()}`
    )
    return await response.json()
  } catch (error) {
    console.error('Error fetching shopping list:', error)
    return null
  }
}

export const generateShoppingList = async (weekStart: Date): Promise<ShoppingListWithItems | null> => {
  const response = await fetch('/api/shopping-list/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekStart: weekStart.toISOString() }),
  })

  if (!response.ok) {
    throw new Error('Failed to generate shopping list')
  }

  return await response.json()
}

export const updateShoppingListItem = async (
  itemId: string,
  updates: Partial<{ checked: boolean; name: string }>
): Promise<ShoppingListItem | null> => {
  const response = await fetch('/api/shopping-list/item/update', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: itemId, ...updates }),
  })

  if (!response.ok) return null
  return await response.json()
}

export const addShoppingListItem = async (
  shoppingListId: string,
  name: string
): Promise<ShoppingListItem | null> => {
  const response = await fetch('/api/shopping-list/item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shoppingListId, name }),
  })

  if (!response.ok) return null
  return await response.json()
}