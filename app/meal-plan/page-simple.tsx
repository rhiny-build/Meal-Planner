/**
 * SIMPLIFIED Meal Plan Page - Learning Version
 *
 * This is a stripped-down version for learning.
 * Features:
 * - 7 days × 2 columns (protein and carb)
 * - Manual recipe selection via dropdowns
 * - Save to database
 *
 * TODO: You'll make some edits to understand the structure
 * TODO: Then I'll build the full version with AI
 */

'use client'

import { useState, useEffect } from 'react'
import type { Recipe } from '@/types'
import Button from '@/components/Button'

// Days of the week
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function SimpleMealPlanPage() {
  // State: All available recipes
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([])

  // State: The 7-day meal plan (each day has proteinRecipeId and carbRecipeId)
  const [weekPlan, setWeekPlan] = useState<{
    day: string
    proteinRecipeId: string
    carbRecipeId: string
  }[]>(
    // Initialize with 7 empty days
    DAYS.map(day => ({ day, proteinRecipeId: '', carbRecipeId: '' }))
  )

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch all recipes when page loads
  useEffect(() => {
    fetchRecipes()
  }, [])

  // Fetch recipes from API
  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes')
      const data = await response.json()
      setAllRecipes(data)
    } catch (error) {
      console.error('Error fetching recipes:', error)
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

  // Save the meal plan
  const handleSave = async () => {
    //setIsSaving(true)
    try {
      // TODO: Call API to save the meal plan
      console.log('Saving meal plan:', weekPlan)
      alert('Meal plan saved! (API call not implemented yet)')
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  // Clear the board
  const handleClear = async () => {
    try {
      const newPlan = DAYS.map(day => ({ day, proteinRecipeId: '', carbRecipeId: '' }))
      setWeekPlan(newPlan)
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to save')
    } 
  }

  // Get recipes that have protein (for protein column dropdowns)
  const proteinRecipes = allRecipes.filter(r => r.proteinType)

  // Get recipes that have carbs (for carb column dropdowns)
  const carbRecipes = allRecipes.filter(r => r.carbType)

  const selectedCount = weekPlan.reduce((count, day) => {
    if (day.proteinRecipeId) {
      count++
    }
    if (day.carbRecipeId) {
      count++
    }
    return count
}, 0)

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Weekly Meal Plan WIP (Simple Version)</h1>

      {/* Save Button */}
      <div className="mb-6">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Meal Plan'}
        </Button>
      </div>

      <div className="mb-6">
        <Button onClick={handleClear} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Clear All'}
        </Button>
      </div>

      {/* The 7×2 Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-100 dark:bg-gray-700 font-semibold">
          <div>Day</div>
          <div>Protein</div>
          <div>Carb</div>
        </div>

        {/* Table Rows - One per day */}
        {weekPlan.map((dayPlan, index) => (
          <div
            key={dayPlan.day}
            className="grid grid-cols-3 gap-4 p-4 border-t border-gray-200 dark:border-gray-700"
          >
            {/* Day Name */}
            <div className="font-medium py-2">
              {dayPlan.day}
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

      {/* Instructions for You */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded">
        <h3 className="font-semibold mb-2">Your Tasks:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
        
          <li>Show a count of how many meals are selected: {selectedCount}</li>
        </ol>
      </div>
    </div>
  )
}
