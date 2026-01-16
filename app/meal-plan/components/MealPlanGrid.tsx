/**
 * MealPlanGrid Component
 *
 * 7×2 grid table displaying the weekly meal plan with protein and carb columns
 */

import type { Recipe, WeekPlan } from '@/types'
import { formatDate } from '@/lib/dateUtils'

interface MealPlanGridProps {
  weekPlan: WeekPlan[]
  proteinRecipes: Recipe[]
  carbRecipes: Recipe[]
  onRecipeChange: (dayIndex: number, column: 'protein' | 'carb', recipeId: string) => void
}

export default function MealPlanGrid({
  weekPlan,
  proteinRecipes,
  carbRecipes,
  onRecipeChange,
}: MealPlanGridProps) {
  return (
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
              onChange={(e) => onRecipeChange(index, 'protein', e.target.value)}
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
              onChange={(e) => onRecipeChange(index, 'carb', e.target.value)}
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
  )
}
