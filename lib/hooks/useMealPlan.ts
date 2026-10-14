/**
 * useMealPlan Hook
 *
 * Manages state and operations for the weekly meal plan.
 * Pure logic lives in mealPlanHelpers; refresh logic in useAutoRefresh.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import type { RecipeWithIngredients, WeekPlan } from '@/types'
import { fetchMealPlan as fetchMealPlanService, fetchAllRecipes, saveMealPlan } from '@/lib/apiService'
import { useDayNotes } from './useDayNotes'
import { useAutoRefresh } from './useAutoRefresh'
import { useWeekDraft } from './useWeekDraft'
import { overlayDraft, reasonsByDate } from '@/lib/mealPlanAgent/weekPlanDraft'
import { formatDateParam } from '@/lib/dateUtils'
import {
  getOrderedDays,
  filterRecipesByType,
  calculateSelectedCount,
  getRecipeKeyFromColumn,
  swapRecipesInPlan,
  createEmptyWeekPlan,
} from '@/lib/mealPlanHelpers'
import type { MealSlotColumn } from '@/lib/mealPlanHelpers'


export function useMealPlan(startDate: Date, weekStartDay: number = 1) {
  const [allRecipes, setAllRecipes] = useState<RecipeWithIngredients[]>([])
  const [weekPlan, setWeekPlan] = useState<WeekPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const days = getOrderedDays(weekStartDay)
  const { dayNotes, handleNoteChange } = useDayNotes(startDate, days)
  const { draft, loadDraft, persistEdits, accept, discard } = useWeekDraft(startDate)
  /** The agent's reason per day (YYYY-MM-DD), for the days of a pending draft Ronen has not changed since */
  const [reasons, setReasons] = useState<Record<string, string>>({})
  /** Edits made on screen that are not saved yet (to the plan, or to the draft) */
  const [dirty, setDirty] = useState(false)
  const latestPlan = useRef<WeekPlan[]>([])

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [recipes, plan, pendingDraft] = await Promise.all([
        fetchAllRecipes(),
        fetchMealPlanService(startDate, days),
        loadDraft(),
      ])
      setAllRecipes(recipes)
      // A pending draft is what the week looks like until it is accepted or thrown away
      setWeekPlan(pendingDraft ? overlayDraft(plan, pendingDraft.days) : plan)
      setReasons(pendingDraft ? reasonsByDate(pendingDraft.days) : {})
      setDirty(false)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [startDate, loadDraft])

  useEffect(() => { fetchData() }, [fetchData])
  useAutoRefresh(fetchData)

  /** An edit on screen: remember it is unsaved, and drop the agent's reason for the days it touched */
  const markEdited = (...dayIndexes: number[]) => {
    setDirty(true)
    setReasons(prev => {
      const next = { ...prev }
      for (const i of dayIndexes) delete next[formatDateParam(latestPlan.current[i]?.date ?? startDate)]
      return next
    })
  }

  const handleRecipeChange = (dayIndex: number, column: MealSlotColumn, recipeId: string) => {
    markEdited(dayIndex)
    setWeekPlan(prev => {
      const newPlan = [...prev]
      newPlan[dayIndex] = { ...newPlan[dayIndex], [getRecipeKeyFromColumn(column)]: recipeId }
      return newPlan
    })
  }

  // While a draft is pending, Ronen's tweaks are kept in the draft (not the plan) a moment after he makes them
  useEffect(() => { latestPlan.current = weekPlan }, [weekPlan])
  useEffect(() => {
    if (!draft || !dirty) return
    const timer = setTimeout(() => { persistEdits(latestPlan.current).then(() => setDirty(false)) }, 600)
    return () => clearTimeout(timer)
  }, [weekPlan, draft, dirty, persistEdits])

  /** Accept all: the draft, with any tweaks, becomes the saved plan */
  const handleAcceptDraft = async () => {
    setIsSaving(true)
    try {
      if (await accept(latestPlan.current)) {
        toast.success('Plan saved')
        await fetchData()
      }
    } finally {
      setIsSaving(false)
    }
  }

  const handleDiscardDraft = async () => {
    if (!confirm('Throw away the draft?')) return
    await discard()
    await fetchData()
  }

  /** Before the agent changes the plan on the server, make sure what is on screen is not lost */
  const flushUnsaved = async () => {
    if (!dirty) return
    if (draft) await persistEdits(latestPlan.current)
    else await saveMealPlan(startDate, latestPlan.current, days)
    setDirty(false)
  }

  const handleSave = async () => {
    if (draft) return handleAcceptDraft()
    setIsSaving(true)
    try {
      const savedPlan = await saveMealPlan(startDate, weekPlan, days)
      if (savedPlan.length > 0) {
        setWeekPlan(savedPlan)
        setDirty(false)
      }
    } catch (error) {
      console.error('Error saving:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = () => {
    if (!confirm('Clear all selections for this week?')) return
    setDirty(true)
    setReasons({})
    setWeekPlan(createEmptyWeekPlan(startDate, weekStartDay))
  }

  const handleSwapRecipes = (column: MealSlotColumn, fromDayIndex: number, toDayIndex: number) => {
    markEdited(fromDayIndex, toDayIndex)
    setWeekPlan(prev => swapRecipesInPlan(prev, column, fromDayIndex, toDayIndex))
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
    draft,
    reasons,
    refresh: fetchData,
    flushUnsaved,
    handleAcceptDraft,
    handleDiscardDraft,
  }
}
