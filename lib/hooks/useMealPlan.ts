/**
 * useMealPlan Hook
 *
 * Manages state and operations for the weekly meal plan
 */

import { useState, useEffect } from 'react'
import type { Recipe, WeekPlan } from '@/types'
import { fetchMealPlan as fetchMealPlanService, fetchAllRecipes, saveMealPlan } from '@/lib/apiService'
import { getMonday, isWeekPast } from '@/lib/dateUtils'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// Day notes type - keyed by day name
type DayNotes = Record<string, string>

// Get localStorage key for notes based on week start date
function getNotesStorageKey(startDate: Date): string {
  return `mealPlanNotes_${startDate.toISOString().split('T')[0]}`
}

// Check if a week has passed (current date is on or after the following Monday)


export function useMealPlan(startDate: Date) {
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])
  const [weekPlan, setWeekPlan] = useState<WeekPlan[]>([])
  const [dayNotes, setDayNotes] = useState<DayNotes>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch data on mount and when date changes
  useEffect(() => {
    fetchData()
    loadNotesFromStorage()
  }, [startDate])

  // Load notes from localStorage (auto-clear if week has passed)
  const loadNotesFromStorage = () => {
    if (typeof window === 'undefined') return
    const storageKey = getNotesStorageKey(startDate)

    // Clear notes for past weeks
    if (isWeekPast(startDate)) {
      localStorage.removeItem(storageKey)
      setDayNotes({})
      return
    }

    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        setDayNotes(JSON.parse(stored))
      } catch {
        setDayNotes({})
      }
    } else {
      setDayNotes({})
    }
  }

  // Save notes to localStorage when they change
  const handleNoteChange = (day: string, note: string) => {
    const newNotes = { ...dayNotes, [day]: note }
    setDayNotes(newNotes)
    if (typeof window !== 'undefined') {
      localStorage.setItem(getNotesStorageKey(startDate), JSON.stringify(newNotes))
    }
  }

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

  const handleRecipeChange = (dayIndex: number, column: 'lunch' | 'protein' | 'carb' | 'vegetable', recipeId: string) => {
    const newPlan = [...weekPlan]
    if (column === 'lunch') {
      newPlan[dayIndex].lunchRecipeId = recipeId
    } else if (column === 'protein') {
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
      return { day, date, lunchRecipeId: '', proteinRecipeId: '', carbRecipeId: '', vegetableRecipeId: '' }
    })
    setWeekPlan(newPlan)
  }

  /**
   * Swap recipes between two days within the same column
   *
   * This is called by the drag-and-drop functionality in MealPlanGrid.
   * When a user drags a cell (e.g., Monday's protein) and drops it on
   * another cell in the same column (e.g., Thursday's protein), this
   * function swaps the recipe IDs between those two days.
   *
   * @param column - Which column to swap: 'lunch', 'protein', 'carb', or 'vegetable'
   * @param fromDayIndex - Index of the source day (0 = Monday, 6 = Sunday)
   * @param toDayIndex - Index of the target day
   */
  const handleSwapRecipes = (
    column: 'lunch' | 'protein' | 'carb' | 'vegetable',
    fromDayIndex: number,
    toDayIndex: number
  ) => {
    // Create a new plan array (immutable update)
    const newPlan = [...weekPlan]

    // Determine which property to swap based on column
    const recipeKey = column === 'lunch'
      ? 'lunchRecipeId'
      : column === 'protein'
      ? 'proteinRecipeId'
      : column === 'carb'
      ? 'carbRecipeId'
      : 'vegetableRecipeId'

    // Swap the values
    const temp = newPlan[fromDayIndex][recipeKey]
    newPlan[fromDayIndex] = { ...newPlan[fromDayIndex], [recipeKey]: newPlan[toDayIndex][recipeKey] }
    newPlan[toDayIndex] = { ...newPlan[toDayIndex], [recipeKey]: temp }

    setWeekPlan(newPlan)
  }

  // Get recipes filtered by type
  const lunchRecipes = allRecipes.filter(r => r.isLunchAppropriate)
  const proteinRecipes = allRecipes.filter(r => r.proteinType)
  const carbRecipes = allRecipes.filter(r => r.carbType)
  const vegetableRecipes = allRecipes.filter(r => r.vegetableType)

  // Calculate selected count
  const selectedCount = weekPlan.reduce((count, day) => {
    if (day.lunchRecipeId) count++
    if (day.proteinRecipeId) count++
    if (day.carbRecipeId) count++
    if (day.vegetableRecipeId) count++
    return count
  }, 0)

  // Apply AI-generated plan to current state
  const applyGeneratedPlan = (modifiedPlan: { date: Date | string; lunchRecipeId?: string; proteinRecipeId: string; carbRecipeId: string; vegetableRecipeId: string }[]) => {
    const newPlan = weekPlan.map(day => {
      const modification = modifiedPlan.find(m => {
        const modDate = new Date(m.date)
        return modDate.toDateString() === day.date.toDateString()
      })
      if (modification) {
        return {
          ...day,
          lunchRecipeId: modification.lunchRecipeId || '',
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
    dayNotes,
    lunchRecipes,
    proteinRecipes,
    carbRecipes,
    vegetableRecipes,
    selectedCount,
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
