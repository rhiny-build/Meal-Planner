/**
 * Meal Plan Client Component
 *
 * Features:
 * - The week as one row per day, each with a swap button
 * - Generate new meal plan with AI
 * - Changing a day's meals and note in a sheet (dropdowns per slot)
 * - Save/load from database
 * - Navigate between weeks
 */

'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { getWeekStart, formatDateParam } from '@/lib/dateUtils'
import { useMealPlan } from '@/lib/hooks/useMealPlan'
import PageHeader from '@/components/PageHeader'
import WeekToolbar from './WeekToolbar'
import WeekList from './WeekList'
import { formatWeekRange, getWeekTitle } from '../helpers/weekLabels'
import AiProgress from '@/components/AiProgress'

const DEFAULT_PROMPT = 'Generate a balanced meal plan for the week following the rules. Do not change existing meals that are already set.'

interface MealPlanClientProps {
  weekStartDay: number
}

export default function MealPlanClient({ weekStartDay }: MealPlanClientProps) {
  const [startDate, setStartDate] = useState<Date>(() => getWeekStart(new Date(), weekStartDay))

  // Restore last visited week from localStorage after hydration
  useEffect(() => {
    const lastVisited = localStorage.getItem('mealPlanLastVisited')
    if (lastVisited) {
      setStartDate(getWeekStart(new Date(lastVisited), weekStartDay))
    }
  }, [weekStartDay])
  const [isGenerating, setIsGenerating] = useState(false)

  const {
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
  } = useMealPlan(startDate, weekStartDay)

  const handlePreviousWeek = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() - 7)
        localStorage.setItem('mealPlanLastVisited', newDate.toISOString())

    setStartDate(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() + 7)
    localStorage.setItem('mealPlanLastVisited', newDate.toISOString())

    setStartDate(newDate)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/meal-plan/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: DEFAULT_PROMPT,
          // Dates as plain local calendar days ("2026-10-12"), not timestamps: a timestamp
          // is a different day on the server and in the model's answer outside UTC.
          currentPlan: weekPlan.map((d) => ({ ...d, date: formatDateParam(d.date) })),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate meal plan')
      }

      const result = await response.json()
      applyGeneratedPlan(result.modifiedPlan, { keepFilled: true })
      toast.success(result.explanation, { duration: 5000 })
    } catch (error) {
      console.error('Error generating meal plan:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate meal plan')
    } finally {
      setIsGenerating(false)
    }
  }


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-ink-soft text-lg">Loading meal plan...</div>
      </div>
    )
  }

  return (
    <div className="max-w-xl md:max-w-3xl mx-auto px-4">
      <PageHeader
        title={getWeekTitle(startDate, getWeekStart(new Date(), weekStartDay))}
        eyebrow={formatWeekRange(startDate)}
      />

      <WeekToolbar
        isGenerating={isGenerating}
        isSaving={isSaving}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onGenerate={handleGenerate}
        onSave={handleSave}
        onClear={handleClear}
      />
      <p className="text-sm text-ink-soft pb-3 px-1" data-testid="selected-count">
        {selectedCount} of 21 meals planned
      </p>

      {/* Filling the empty slots with Claude: measured 9-13 s */}
      <AiProgress
        active={isGenerating}
        label="Filling in your meal plan"
        estimate={[10, 20]}
        className="mb-4"
      />

      <WeekList
        weekPlan={weekPlan}
        dayNotes={dayNotes}
        lunchRecipes={lunchRecipes}
        proteinRecipes={proteinRecipes}
        carbRecipes={carbRecipes}
        vegetableRecipes={vegetableRecipes}
        onRecipeChange={handleRecipeChange}
        onNoteChange={handleNoteChange}
        onSwapRecipes={handleSwapRecipes}
      />
    </div>
  )
}
