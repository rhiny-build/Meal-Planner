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

  // TODO: Re-enable AI generation after fixing endpoint integration
  const handleGenerate = async () => {
    alert('AI meal plan generation coming soon!')
    setIsGenerating(false)
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
