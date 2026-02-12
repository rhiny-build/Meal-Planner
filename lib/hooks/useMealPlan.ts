/**
 * useMealPlan Hook
 *
 * Manages state and operations for the weekly meal plan.
 * Pure logic lives in mealPlanHelpers; refresh logic in useAutoRefresh.
 */

import { useState, useEffect, useCallback } from 'react'
import type { RecipeWithIngredients, WeekPlan } from '@/types'
import { fetchMealPlan as fetchMealPlanService, fetchAllRecipes, saveMealPlan } from '@/lib/apiService'
import { syncMealIngredients } from '@/app/(modules)/shopping-list/actions'
import { useDayNotes } from './useDayNotes'
import { useAutoRefresh } from './useAutoRefresh'
import {
  DAYS,
  filterRecipesByType,
  calculateSelectedCount,
  getRecipeKeyFromColumn,
  swapRecipesInPlan,
  applyGeneratedPlanToWeek,
  createEmptyWeekPlan,
} from '@/lib/mealPlanHelpers'
import type { MealSlotColumn } from '@/lib/mealPlanHelpers'


export function useMealPlan(startDate: Date) {
  const [allRecipes, setAllRecipes] = useState<RecipeWithIngredients[]>([])
  const [weekPlan, setWeekPlan] = useState<WeekPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const { dayNotes, handleNoteChange } = useDayNotes(startDate)

  const fetchData = useCallback(async () => {
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
  }, [startDate])

  useEffect(() => { fetchData() }, [fetchData])
  useAutoRefresh(fetchData)

  const handleRecipeChange = (dayIndex: number, column: MealSlotColumn, recipeId: string) => {
    setWeekPlan(prev => {
      const newPlan = [...prev]
      newPlan[dayIndex] = { ...newPlan[dayIndex], [getRecipeKeyFromColumn(column)]: recipeId }
      return newPlan
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const savedPlan = await saveMealPlan(startDate, weekPlan, DAYS)
      if (savedPlan.length > 0) {
        setWeekPlan(savedPlan)
      }
      await syncMealIngredients(startDate)
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = () => {
    if (!confirm('Clear all selections for this week?')) return
    setWeekPlan(createEmptyWeekPlan(startDate))
  }

  const handleSwapRecipes = (column: MealSlotColumn, fromDayIndex: number, toDayIndex: number) => {
    setWeekPlan(swapRecipesInPlan(weekPlan, column, fromDayIndex, toDayIndex))
  }

  const applyGeneratedPlan = (modifiedPlan: Parameters<typeof applyGeneratedPlanToWeek>[1]) => {
    setWeekPlan(applyGeneratedPlanToWeek(weekPlan, modifiedPlan))
  }

  const { lunchRecipes, proteinRecipes, carbRecipes, vegetableRecipes } = filterRecipesByType(allRecipes)

  return {
    weekPlan,
    dayNotes,
    lunchRecipes,
    proteinRecipes,
    carbRecipes,
    vegetableRecipes,
    selectedCount: calculateSelectedCount(weekPlan),
    isLoading,
    isSaving,
    handleRecipeChange,
    handleNoteChange,
    handleSave,
    handleClear,
    handleSwapRecipes,
    applyGeneratedPlan,
  }
}
