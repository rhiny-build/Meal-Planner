/**
 * Full Meal Plan Page with Protein/Carb Split
 *
 * Features:
 * - 7 days × 2 columns (protein and carb)
 * - Generate new meal plan with AI
 * - Manual recipe selection via dropdowns
 * - Save/load from database
 * - Navigate between weeks
 */

'use client'

import { useState, useEffect } from 'react'
import type {  Recipe, WeekPlan } from '@/types'
import Button from '@/components/Button'
import { getMonday, formatDate } from '@/lib/dateUtils'
import { fetchMealPlan as fetchMealPlanService, fetchAllRecipes as fetchReceipesService, saveMealPlan } from '@/lib/apiService'
import { generateMealPlan } from '@/lib/aiService'

// Days of the week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function MealPlanPage() {
  // State for all available recipes
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])

  // State for the 7-day meal plan from database
  //const [mealPlans, setMealPlans] = useState<MealPlanWithRecipe[]>([])

  // State for week navigation
  const [startDate, setStartDate] = useState<Date>(getMonday(new Date()))

  // State for the editable week plan (protein and carb columns)
  const [weekPlan, setWeekPlan] = useState<WeekPlan[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch meal plan and recipes on mount and when date changes
  useEffect(() => {
    fetchAllRecipes()
    fetchMealPlan()
  }, [startDate])

  // Fetch all recipes from API
  const fetchAllRecipes = async () => {
    try {
      const data = await fetchReceipesService()
      setAllRecipes(data)
    } catch (error) {
      console.error('Error fetching recipes:', error)
    }
  }

  // Fetch the current week's meal plan from database
  const fetchMealPlan = async () => {
    try{
        const plan = await fetchMealPlanService(startDate, DAYS);
         setWeekPlan(plan)
    }
      
    catch (error) {
      console.error('Error fetching meal plan:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle when user changes a dropdown
  const handleRecipeChange = (dayIndex: number, column: 'protein' | 'carb', recipeId: string) => {
    const newPlan = [...weekPlan]
    if (column === 'protein') {
      newPlan[dayIndex].proteinRecipeId = recipeId
    } else {
      newPlan[dayIndex].carbRecipeId = recipeId
    }
    setWeekPlan(newPlan)
  }

  // Generate a new meal plan with AI (fills empty slots only)
  // TODO: Re-enable AI generation after fixing endpoint integration
  const handleGenerate = async () => {
    alert('AI meal plan generation coming soon!')
    return

    // const emptyCount = weekPlan.reduce((count, day) => {
    //   if (!day.proteinRecipeId) count++
    //   if (!day.carbRecipeId) count++
    //   return count
    // }, 0)

    // if (emptyCount === 0) {
    //   alert('All meals are already selected. Clear some slots first if you want AI to generate new ones.')
    //   return
    // }

    // const message = emptyCount === 14
    //   ? 'Generate a complete meal plan for this week?'
    //   : `Fill the ${emptyCount} empty meal slots with AI suggestions? Your ${14 - emptyCount} selected meals will remain unchanged.`

    // if (!confirm(message)) {
    //   return
    // }

    // setIsGenerating(true)
    // try {
    //   const aiSuggestions = await generateMealPlan(startDate, weekPlan)

    //   // Merge AI suggestions with existing selections
    //   const updatedPlan = weekPlan.map((day, index) => ({
    //     ...day,
    //     proteinRecipeId: day.proteinRecipeId || aiSuggestions[index]?.proteinRecipeId || '',
    //     carbRecipeId: day.carbRecipeId || aiSuggestions[index]?.carbRecipeId || '',
    //   }))
    //   setWeekPlan(updatedPlan)
    // } catch (error) {
    //   console.error('Error generating meal plan:', error)
    //   alert('Failed to generate meal plan')
    // } finally {
    //   setIsGenerating(false)
    // }
  }

  // Save the current week plan to database
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const savedPlan = await saveMealPlan(startDate, weekPlan, DAYS)
      
      if (savedPlan.length > 0) {
        alert('Meal plan saved!')
        setWeekPlan(savedPlan)
      } else {
        
        alert('Failed to save meal plan')
      }
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save meal plan')
    } finally {
      setIsSaving(false)
    }
  }

  // Clear the board
  const handleClear = () => {
    if (!confirm('Clear all selections for this week?')) {
      return
    }

    const newPlan = DAYS.map((day, index) => {
      const date = new Date(startDate)
      date.setDate(date.getDate() + index)
      return { day, date, proteinRecipeId: '', carbRecipeId: '' }
    })
    setWeekPlan(newPlan)
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

  // Get recipes filtered by type
  const proteinRecipes = allRecipes.filter(r => r.proteinType)
  const carbRecipes = allRecipes.filter(r => r.carbType)

  // Calculate selected count
  const selectedCount = weekPlan.reduce((count, day) => {
    if (day.proteinRecipeId) count++
    if (day.carbRecipeId) count++
    return count
  }, 0)

  if (isLoading) {
    return <div className="text-center py-12">Loading meal plan...</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Weekly Meal Plan</h1>

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

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <Button onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate with AI'}
        </Button>
        <Button onClick={handleSave} disabled={isSaving} variant="secondary">
          {isSaving ? 'Saving...' : 'Save Meal Plan'}
        </Button>
        <Button onClick={handleClear} variant="secondary">
          Clear All
        </Button>
      </div>

      {/* Meal Count */}
      <div className="mb-4 text-lg">
        <span className="font-medium">Selected meals:</span> {selectedCount} / 14
      </div>

      {/* The 7×2 Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-4 gap-4 p-4 bg-gray-100 dark:bg-gray-700 font-semibold">
          <div>Day</div>
          <div>Date</div>
          <div>Protein</div>
          <div>Carb</div>
        </div>

        {/* Table Rows - One per day */}
        {weekPlan.map((dayPlan, index) => (
          <div
            key={dayPlan.day}
            className="grid grid-cols-4 gap-4 p-4 border-t border-gray-200 dark:border-gray-700"
          >
            {/* Day Name */}
            <div className="font-medium py-2">
              {dayPlan.day}
            </div>

            {/* Date */}
            <div className="text-gray-600 dark:text-gray-400 py-2">
              {formatDate(dayPlan.date)}
            </div>

            {/* Protein Dropdown */}
            <div>
              <select
                value={dayPlan.proteinRecipeId}
                onChange={(e) => handleRecipeChange(index, 'protein', e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">-- Select Protein --</option>
                {proteinRecipes.map(recipe => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Carb Dropdown */}
            <div>
              <select
                value={dayPlan.carbRecipeId}
                onChange={(e) => handleRecipeChange(index, 'carb', e.target.value)}
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">-- Select Carb --</option>
                {carbRecipes.map(recipe => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

