/**
 * MealPlanGrid Component
 *
 * 7×3 grid table displaying the weekly meal plan with protein, carb, and vegetable columns
 */

import type { Recipe, WeekPlan } from '@/types'
import { formatDate } from '@/lib/dateUtils'

interface MealPlanGridProps {
  weekPlan: WeekPlan[]
  proteinRecipes: Recipe[]
  carbRecipes: Recipe[]
  vegetableRecipes: Recipe[]
  onRecipeChange: (dayIndex: number, column: 'protein' | 'carb' | 'vegetable', recipeId: string) => void
}

export default function MealPlanGrid({
  weekPlan,
  proteinRecipes,
  carbRecipes,
  vegetableRecipes,
  onRecipeChange,
}: MealPlanGridProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-5 gap-4 p-4 bg-gray-100 dark:bg-gray-700 font-semibold">
        <div>Day</div>
        <div>Date</div>
        <div>Protein</div>
        <div>Carb</div>
        <div>Vegetable</div>
      </div>

      {/* Table Rows - One per day */}
      {weekPlan.map((dayPlan, index) => (
        <div
          key={dayPlan.day}
          className="grid grid-cols-5 gap-4 p-4 border-t border-gray-200 dark:border-gray-700"
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

          {/* Vegetable Dropdown */}
          <div>
            <select
              value={dayPlan.vegetableRecipeId}
              onChange={(e) => onRecipeChange(index, 'vegetable', e.target.value)}
              className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">-- Select Vegetable --</option>
              {vegetableRecipes.map(recipe => (
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
