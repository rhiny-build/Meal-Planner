/**
 * Meal Plan Page
 *
 * Features:
 * - 7 days × 2 columns (protein and carb)
 * - Generate new meal plan with AI
 * - Manual recipe selection via dropdowns
 * - Save/load from database
 * - Navigate between weeks
 */

'use client'

import { useState } from 'react'
import { getMonday } from '@/lib/dateUtils'
import { useMealPlan } from '@/lib/hooks/useMealPlan'
import { saveMealPlan } from '@/lib/apiService'
import MealPlanHeader from './components/MealPlanHeader'
import MealPlanGrid from './components/MealPlanGrid'

export default function MealPlanPage() {
  const [startDate, setStartDate] = useState<Date>(getMonday(new Date()))
  const [isGenerating, setIsGenerating] = useState(false)

  const {
    weekPlan,
    proteinRecipes,
    carbRecipes,
    selectedCount,
    isLoading,
    isSaving,
    handleRecipeChange,
    handleSave,
    handleClear,
  } = useMealPlan(startDate)

  const handlePreviousWeek = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() - 7)
    setStartDate(newDate)
  }

  const handleNextWeek = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() + 7)
    setStartDate(newDate)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      // Save first to get meal plan IDs
      const savedPlan = await saveMealPlan(startDate, weekPlan, ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
      const mealPlanIds = savedPlan.map((mp: { mealPlanId?: string }) => mp.mealPlanId as string)

      const response = await fetch('/api/meal-plan/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: 'Generate a balanced meal plan for the week following the rules. Do not change existing meals that are already set.',
          mealPlanIds,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate meal plan')
      }

      const result = await response.json()
      alert(result.explanation)
      window.location.reload()
    } catch (error) {
      console.error('Error generating meal plan:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate meal plan')
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading meal plan...</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Weekly Meal Plan</h1>

      <MealPlanHeader
        startDate={startDate}
        selectedCount={selectedCount}
        isGenerating={isGenerating}
        isSaving={isSaving}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onGenerate={handleGenerate}
        onSave={handleSave}
        onClear={handleClear}
      />

      <MealPlanGrid
        weekPlan={weekPlan}
        proteinRecipes={proteinRecipes}
        carbRecipes={carbRecipes}
        onRecipeChange={handleRecipeChange}
      />
    </div>
  )
}
