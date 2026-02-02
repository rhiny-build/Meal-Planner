/**
 * Meal Plan Page
 *
 * Features:
 * - 7 days × 3 columns (protein, carb, and vegetable)
 * - Generate new meal plan with AI
 * - Manual recipe selection via dropdowns
 * - Save/load from database
 * - Navigate between weeks
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMonday } from '@/lib/dateUtils'
import { useMealPlan } from '@/lib/hooks/useMealPlan'
import MealPlanHeader from './components/MealPlanHeader'
import MealPlanGrid from './components/MealPlanGrid'

const DEFAULT_PROMPT = 'Generate a balanced meal plan for the week following the rules. Do not change existing meals that are already set.'

export default function MealPlanPage() {
  const router = useRouter()
  const [startDate, setStartDate] = useState<Date>(() => getMonday(new Date()))

  // Restore last visited week from localStorage after hydration
  useEffect(() => {
    const lastVisited = localStorage.getItem('mealPlanLastVisited')
    if (lastVisited) {
      setStartDate(getMonday(new Date(lastVisited)))
    }
  }, [])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingList, setIsGeneratingList] = useState(false)

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
  } = useMealPlan(startDate)

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
          currentPlan: weekPlan,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate meal plan')
      }

      const result = await response.json()
      applyGeneratedPlan(result.modifiedPlan)
      alert(result.explanation)
    } catch (error) {
      console.error('Error generating meal plan:', error)
      alert(error instanceof Error ? error.message : 'Failed to generate meal plan')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateShoppingList = async () => {
    setIsGeneratingList(true)
    try {
      const response = await fetch('/api/shopping-list/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart: startDate.toISOString() }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate shopping list')
      }

      router.push(`/shopping-list?week=${startDate.toISOString()}`)
    } catch (error) {
      console.error('Error generating shopping list:', error)
      alert('Failed to generate shopping list')
    } finally {
      setIsGeneratingList(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 dark:text-neutral-400 text-lg">Loading meal plan...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">Weekly Meal Plan</h1>

      <MealPlanHeader
        startDate={startDate}
        selectedCount={selectedCount}
        isGenerating={isGenerating}
        isSaving={isSaving}
        isGeneratingList={isGeneratingList}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onGenerate={handleGenerate}
        onSave={handleSave}
        onClear={handleClear}
        onGenerateShoppingList={handleGenerateShoppingList}
      />

      <MealPlanGrid
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
