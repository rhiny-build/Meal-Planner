
import type { MealPlanWithRecipe, WeekPlan, Recipe } from '@/types'


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

        // Separate protein and carb
        const proteinMeal = dayMealPlans.find((mp: MealPlanWithRecipe) =>
            mp.proteinRecipeId
        )
        const carbMeal = dayMealPlans.find((mp: MealPlanWithRecipe) =>
            mp.carbRecipeId
        )

        return {
            day,
            date,
            proteinRecipeId: proteinMeal?.proteinRecipeId || '',
            carbRecipeId: carbMeal?.carbRecipeId || '',
            mealPlanId: proteinMeal?.id || carbMeal?.id
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
            carbRecipeId: weekDay.carbRecipeId || null
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