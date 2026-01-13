/**
 * Meal Plan Page
 *
 * Main page for viewing and managing the weekly meal plan.
 * Features:
 * - View current week's meal plan
 * - Generate new meal plan with AI
 * - Modify meals by clicking to select from dropdown
 * - Natural language modifications with AI
 * - Navigate between weeks
 */

'use client'

import { useState, useEffect } from 'react'
import type { MealPlanWithRecipe, Recipe } from '@/types'
import Button from '@/components/Button'

export default function MealPlanPage() {
  // State for meal plan
  const [mealPlans, setMealPlans] = useState<MealPlanWithRecipe[]>([])
  const [startDate, setStartDate] = useState<Date>(getMonday(new Date()))
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)

  // State for all recipes (for dropdown selection)
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])

  // State for editing a specific meal
  const [editingMealId, setEditingMealId] = useState<string | null>(null)

  // State for natural language modification
  const [nlInstruction, setNlInstruction] = useState('')
  const [isModifying, setIsModifying] = useState(false)
  const [modificationResult, setModificationResult] = useState('')

  // Fetch meal plan and recipes on mount and when date changes
  useEffect(() => {
    fetchMealPlan()
    fetchAllRecipes()
  }, [startDate])

  // Fetch the current week's meal plan
  const fetchMealPlan = async () => {
    try {
      const response = await fetch(
        `/api/meal-plan?startDate=${startDate.toISOString()}`
      )
      const data = await response.json()
      setMealPlans(data.mealPlans)
    } catch (error) {
      console.error('Error fetching meal plan:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch all recipes for the dropdown
  const fetchAllRecipes = async () => {
    try {
      const response = await fetch('/api/recipes')
      const data = await response.json()
      setAllRecipes(data)
    } catch (error) {
      console.error('Error fetching recipes:', error)
    }
  }

  // Generate a new meal plan with AI
  const handleGenerate = async () => {
    if (
      !confirm(
        'Generate a new meal plan for this week? This will replace the current plan.'
      )
    ) {
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: startDate.toISOString() }),
      })

      if (response.ok) {
        const data = await response.json()
        setMealPlans(data.mealPlans)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to generate meal plan')
      }
    } catch (error) {
      console.error('Error generating meal plan:', error)
      alert('Failed to generate meal plan')
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle changing a meal to a different recipe
  const handleChangeMeal = async (mealPlanId: string, newRecipeId: string) => {
    try {
      const response = await fetch('/api/meal-plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ id: mealPlanId, recipeId: newRecipeId }],
        }),
      })

      if (response.ok) {
        await fetchMealPlan()
        setEditingMealId(null)
      }
    } catch (error) {
      console.error('Error updating meal:', error)
      alert('Failed to update meal')
    }
  }

  // Handle natural language modification
  const handleNLModification = async () => {
    if (!nlInstruction.trim()) {
      alert('Please enter an instruction')
      return
    }

    if (mealPlans.length === 0) {
      alert('No meal plan to modify. Generate one first.')
      return
    }

    setIsModifying(true)
    setModificationResult('')

    try {
      const response = await fetch('/api/meal-plan/modify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: nlInstruction,
          mealPlanIds: mealPlans.map(mp => mp.id),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setModificationResult(data.explanation)
        await fetchMealPlan()
        setNlInstruction('')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to modify meal plan')
      }
    } catch (error) {
      console.error('Error modifying meal plan:', error)
      alert('Failed to modify meal plan')
    } finally {
      setIsModifying(false)
    }
  }

  // Navigate to previous week
  const handlePreviousWeek = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() - 7)
    setStartDate(newDate)
    setIsLoading(true)
  }

  // Navigate to next week
  const handleNextWeek = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() + 7)
    setStartDate(newDate)
    setIsLoading(true)
  }

  // Format date for display
  const formatDate = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-lg">Loading meal plan...</p>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Weekly Meal Plan - WIP</h1>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <Button variant="secondary" onClick={handlePreviousWeek}>
          ← Previous Week
        </Button>
        <h2 className="text-xl font-semibold">
          Week of {formatDate(startDate)}
        </h2>
        <Button variant="secondary" onClick={handleNextWeek}>
          Next Week →
        </Button>
      </div>

      {/* Generate Button */}
      <div className="mb-6">
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate New Meal Plan'}
        </Button>
      </div>

      {/* Meal Plan Display */}
      {mealPlans.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No meal plan for this week yet.
          </p>
          <Button onClick={handleGenerate}>Generate Meal Plan</Button>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {mealPlans.map(mealPlan => (
            <div
              key={mealPlan.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-lg">
                      {mealPlan.dayOfWeek}
                    </span>
                    <span className="text-gray-500 text-sm">
                      {formatDate(new Date(mealPlan.date))}
                    </span>
                  </div>

                  {/* If editing this meal, show dropdown */}
                  {editingMealId === mealPlan.id ? (
                    <div className="flex gap-2 items-center">
                      <select
                        className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                        defaultValue={mealPlan.recipeId}
                        onChange={e =>
                          handleChangeMeal(mealPlan.id, e.target.value)
                        }
                      >
                        {allRecipes.map(recipe => (
                          <option key={recipe.id} value={recipe.id}>
                            {recipe.name} ({recipe.proteinType},{' '}
                            {recipe.carbType}, {recipe.prepTime})
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingMealId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xl font-medium mb-1">
                        {mealPlan.recipe.name}
                      </h3>
                      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span className="capitalize">
                          {mealPlan.recipe.proteinType.replace('-', ' ')}
                        </span>
                        <span className="capitalize">
                          {mealPlan.recipe.carbType}
                        </span>
                        <span className="capitalize">
                          {mealPlan.recipe.prepTime}
                        </span>
                        <span className="capitalize">
                          {mealPlan.recipe.tier === 'non-regular'
                            ? 'Non-Regular'
                            : mealPlan.recipe.tier}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Edit button (only show when not editing) */}
                {editingMealId !== mealPlan.id && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingMealId(mealPlan.id)}
                  >
                    Change
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Natural Language Modification */}
      {mealPlans.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">
            Natural Language Modifications
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Tell the AI how you'd like to change your meal plan. For example:
            "swap Tuesday for something faster" or "replace chicken with fish on
            Wednesday"
          </p>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={nlInstruction}
              onChange={e => setNlInstruction(e.target.value)}
              placeholder="e.g., swap Tuesday for something faster"
              className="flex-1 p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  handleNLModification()
                }
              }}
            />
            <Button onClick={handleNLModification} disabled={isModifying}>
              {isModifying ? 'Modifying...' : 'Apply'}
            </Button>
          </div>
          {modificationResult && (
            <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-800">
              <p className="text-sm">{modificationResult}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Helper function to get the Monday of the current week
 */
function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}
