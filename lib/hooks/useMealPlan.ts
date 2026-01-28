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

  useEffect(() => {
    const handlevisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }
    
    document.addEventListener('visibilitychange', handlevisibilityChange)
    
    return () => {
        document.removeEventListener('visibilitychange', handlevisibilityChange)
    }
  }, [])

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

  const handleRecipeChange = (dayIndex: number, column: 'protein' | 'carb' | 'vegetable', recipeId: string) => {
    const newPlan = [...weekPlan]
    if (column === 'protein') {
      newPlan[dayIndex].proteinRecipeId = recipeId
    } else if (column === 'carb') {
      newPlan[dayIndex].carbRecipeId = recipeId
    } else {
      newPlan[dayIndex].vegetableRecipeId = recipeId
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
      return { day, date, proteinRecipeId: '', carbRecipeId: '', vegetableRecipeId: '' }
    })
    setWeekPlan(newPlan)
  }

  // Get recipes filtered by type
  const proteinRecipes = allRecipes.filter(r => r.proteinType)
  const carbRecipes = allRecipes.filter(r => r.carbType)
  const vegetableRecipes = allRecipes.filter(r => r.vegetableType)

  // Calculate selected count
  const selectedCount = weekPlan.reduce((count, day) => {
    if (day.proteinRecipeId) count++
    if (day.carbRecipeId) count++
    if (day.vegetableRecipeId) count++
    return count
  }, 0)

  // Apply AI-generated plan to current state
  const applyGeneratedPlan = (modifiedPlan: { date: Date | string; proteinRecipeId: string; carbRecipeId: string; vegetableRecipeId: string }[]) => {
    const newPlan = weekPlan.map(day => {
      const modification = modifiedPlan.find(m => {
        const modDate = new Date(m.date)
        return modDate.toDateString() === day.date.toDateString()
      })
      if (modification) {
        return {
          ...day,
          proteinRecipeId: modification.proteinRecipeId || '',
          carbRecipeId: modification.carbRecipeId || '',
          vegetableRecipeId: modification.vegetableRecipeId || '',
        }
      }
      return day
    })
    setWeekPlan(newPlan)
  }

  return {
    weekPlan,
    proteinRecipes,
    carbRecipes,
    vegetableRecipes,
    selectedCount,
    isLoading,
    isSaving,
    handleRecipeChange,
    handleSave,
    handleClear,
    applyGeneratedPlan,
  }
}
