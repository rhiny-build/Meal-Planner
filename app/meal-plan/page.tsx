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
import { useRouter } from 'next/navigation'
import { getMonday } from '@/lib/dateUtils'
import { useMealPlan } from '@/lib/hooks/useMealPlan'
import MealPlanHeader from './components/MealPlanHeader'
import MealPlanGrid from './components/MealPlanGrid'

const DEFAULT_PROMPT = 'Generate a balanced meal plan for the week following the rules. Do not change existing meals that are already set.'

export default function MealPlanPage() {

  //check local storage for saved date for the planner

  const lastVisited = typeof window !== 'undefined' ? localStorage.getItem('mealPlanLastVisited') : null
  let weekStart = getMonday(new Date());
  if (lastVisited) {
    const parsedDate = new Date(lastVisited)
    weekStart = getMonday(parsedDate)
  }

  const router = useRouter()
  const [startDate, setStartDate] = useState<Date>(weekStart)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingList, setIsGeneratingList] = useState(false)
  const [debugPrompt, setDebugPrompt] = useState(DEFAULT_PROMPT)

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
          instruction: debugPrompt,
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
        isGeneratingList={isGeneratingList}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onGenerate={handleGenerate}
        onSave={handleSave}
        onClear={handleClear}
        onGenerateShoppingList={handleGenerateShoppingList}
      />

      {/* Debug: Test different prompts */}
      <div className="my-4 p-4 border border-dashed border-gray-400 rounded bg-gray-50 dark:bg-gray-800">
        <label className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">
          Debug: AI Prompt (edit to test different prompts)
        </label>
        <textarea
          value={debugPrompt}
          onChange={(e) => setDebugPrompt(e.target.value)}
          className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 font-mono text-sm"
          rows={3}
        />
        <button
          onClick={() => setDebugPrompt(DEFAULT_PROMPT)}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Reset to default
        </button>
      </div>

      <MealPlanGrid
        weekPlan={weekPlan}
        proteinRecipes={proteinRecipes}
        carbRecipes={carbRecipes}
        onRecipeChange={handleRecipeChange}
      />
    </div>
  )
}
