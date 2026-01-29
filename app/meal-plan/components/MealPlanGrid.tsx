/**
 * MealPlanGrid Component
 *
 * 7-day grid table displaying the weekly meal plan with notes and meal columns
 * Supports light and dark themes
 */

import type { Recipe, WeekPlan } from '@/types'
import { formatDate } from '@/lib/dateUtils'
import SearchableSelect from '@/components/SearchableSelect'

interface MealPlanGridProps {
  weekPlan: WeekPlan[]
  dayNotes: Record<string, string>
  proteinRecipes: Recipe[]
  carbRecipes: Recipe[]
  vegetableRecipes: Recipe[]
  onRecipeChange: (dayIndex: number, column: 'protein' | 'carb' | 'vegetable', recipeId: string) => void
  onNoteChange: (day: string, note: string) => void
}

export default function MealPlanGrid({
  weekPlan,
  dayNotes,
  proteinRecipes,
  carbRecipes,
  vegetableRecipes,
  onRecipeChange,
  onNoteChange,
}: MealPlanGridProps) {

  const proteinOptions = proteinRecipes.map(recipe => ({
    value: String(recipe.id),
    label: recipe.name
  }))

  const carbOptions = carbRecipes.map(recipe => ({
    value: String(recipe.id),
    label: recipe.name
  }))

  const vegetableOptions = vegetableRecipes.map(recipe => ({
    value: String(recipe.id),
    label: recipe.name
  }))

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg overflow-hidden shadow-md dark:shadow-xl">
      {/* Table Header */}
      <div className="grid grid-cols-[85px_90px_1fr_1fr_1fr_1fr] gap-4 px-5 py-3 bg-gray-100 dark:bg-neutral-800">
        <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Day</div>
        <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Date</div>
        <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Notes</div>
        <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Protein</div>
        <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Carb</div>
        <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Vegetable</div>
      </div>

      {/* Table Rows - One per day */}
      {weekPlan.map((dayPlan, index) => (
        <div
          key={dayPlan.day}
          className={`grid grid-cols-[85px_90px_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 ${
            index !== weekPlan.length - 1 ? 'border-b border-gray-200 dark:border-neutral-800' : ''
          } hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors`}
        >
          {/* Day Name */}
          <div className="font-semibold text-gray-900 dark:text-white self-center">
            {dayPlan.day}
          </div>

          {/* Date */}
          <div className="text-gray-500 dark:text-neutral-500 text-sm self-center">
            {formatDate(dayPlan.date)}
          </div>

          {/* Notes */}
          <div>
            <input
              type="text"
              value={dayNotes[dayPlan.day] || ''}
              onChange={(e) => onNoteChange(dayPlan.day, e.target.value)}
              placeholder="Add note..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-neutral-800/50 border border-gray-300 dark:border-neutral-700 rounded text-gray-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-0 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-neutral-600"
            />
          </div>

          {/* Protein Dropdown */}
          <div>
            <SearchableSelect
              options={proteinOptions}
              value={dayPlan.proteinRecipeId}
              onChange={(value) => onRecipeChange(index, 'protein', value)}
              placeholder="Select..."
              accent="fuchsia"
            />
          </div>

          {/* Carb Dropdown */}
          <div>
            <SearchableSelect
              options={carbOptions}
              value={dayPlan.carbRecipeId}
              onChange={(value) => onRecipeChange(index, 'carb', value)}
              placeholder="Select..."
              accent="cyan"
            />
          </div>

          {/* Vegetable Dropdown */}
          <div>
            <SearchableSelect
              options={vegetableOptions}
              value={dayPlan.vegetableRecipeId}
              onChange={(value) => onRecipeChange(index, 'vegetable', value)}
              placeholder="Select..."
              accent="lime"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
