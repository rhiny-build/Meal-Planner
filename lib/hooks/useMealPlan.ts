/**
 * useMealPlan Hook
 *
 * Manages state and operations for the weekly meal plan
 */

import { useState, useEffect } from 'react'
import type { Recipe, WeekPlan } from '@/types'
import { fetchMealPlan as fetchMealPlanService, fetchAllRecipes, saveMealPlan } from '@/lib/apiService'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export function useMealPlan(startDate: Date) {
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [weekPlan, setWeekPlan] = useState<WeekPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch data on mount and when date changes
  useEffect(() => {
    fetchData()
  }, [startDate])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [recipes, plan] = await Promise.all([
        fetchAllRecipes(),
        fetchMealPlanService(startDate, DAYS)
      ])
      setAllRecipes(recipes)
      setWeekPlan(plan)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecipeChange = (dayIndex: number, column: 'protein' | 'carb', recipeId: string) => {
    const newPlan = [...weekPlan]
    if (column === 'protein') {
      newPlan[dayIndex].proteinRecipeId = recipeId
    } else {
      newPlan[dayIndex].carbRecipeId = recipeId
    }
    setWeekPlan(newPlan)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const savedPlan = await saveMealPlan(startDate, weekPlan, DAYS)
      if (savedPlan.length > 0) {
        setWeekPlan(savedPlan)
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = () => {
    if (!confirm('Clear all selections for this week?')) {
      return
    }

    const newPlan = DAYS.map((day, index) => {
      const date = new Date(startDate)
      date.setDate(date.getDate() + index)
      return { day, date, proteinRecipeId: '', carbRecipeId: '' }
    })
    setWeekPlan(newPlan)
  }

  // Get recipes filtered by type
  const proteinRecipes = allRecipes.filter(r => r.proteinType)
  const carbRecipes = allRecipes.filter(r => r.carbType)

  // Calculate selected count
  const selectedCount = weekPlan.reduce((count, day) => {
    if (day.proteinRecipeId) count++
    if (day.carbRecipeId) count++
    return count
  }, 0)

  return {
    weekPlan,
    proteinRecipes,
    carbRecipes,
    selectedCount,
    isLoading,
    isSaving,
    handleRecipeChange,
    handleSave,
    handleClear,
  }
}
