/**
 * MealPlanGridRow Component
 *
 * Single row in the meal plan grid displaying day info and meal dropdowns.
 * Extracted from MealPlanGrid for better maintainability.
 */

'use client'

import type { WeekPlan } from '@/types'
import { formatDate } from '@/lib/dateUtils'
import SearchableSelect from '@/components/SearchableSelect'
import DraggableRecipeCell from './DraggableRecipeCell'
import { SelectOption } from '../helpers/gridHelpers'
import { getRecipeName } from '../helpers/dndHelpers'
import type { Recipe } from '@/types'

interface MealPlanGridRowProps {
  dayPlan: WeekPlan
  dayIndex: number
  isLastRow: boolean
  dayNote: string
  lunchOptions: SelectOption[]
  proteinOptions: SelectOption[]
  carbOptions: SelectOption[]
  vegetableOptions: SelectOption[]
  lunchRecipes: Recipe[]
  proteinRecipes: Recipe[]
  carbRecipes: Recipe[]
  vegetableRecipes: Recipe[]
  onRecipeChange: (dayIndex: number, column: 'lunch' | 'protein' | 'carb' | 'vegetable', recipeId: string) => void
  onNoteChange: (day: string, note: string) => void
}

export default function MealPlanGridRow({
  dayPlan,
  dayIndex,
  isLastRow,
  dayNote,
  lunchOptions,
  proteinOptions,
  carbOptions,
  vegetableOptions,
  lunchRecipes,
  proteinRecipes,
  carbRecipes,
  vegetableRecipes,
  onRecipeChange,
  onNoteChange,
}: MealPlanGridRowProps) {
  return (
    <div
      className={`col-span-7 grid grid-cols-subgrid gap-4 px-5 py-4 ${
        !isLastRow ? 'border-b border-gray-200 dark:border-neutral-800' : ''
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

      {/* Notes - not draggable */}
      <div>
        <input
          type="text"
          value={dayNote}
          onChange={(e) => onNoteChange(dayPlan.day, e.target.value)}
          placeholder="Add note..."
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-neutral-800/50 border border-gray-300 dark:border-neutral-700 rounded text-gray-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-0 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-neutral-600"
        />
      </div>

      {/* Lunch Dropdown - Draggable */}
      <DraggableRecipeCell
        id={`lunch-${dayIndex}`}
        recipeName={getRecipeName(dayPlan.lunchRecipeId, lunchRecipes)}
      >
        <SearchableSelect
          options={lunchOptions}
          value={dayPlan.lunchRecipeId}
          onChange={(value) => onRecipeChange(dayIndex, 'lunch', value)}
          placeholder="Select..."
          accent="amber"
        />
      </DraggableRecipeCell>

      {/* Protein Dropdown - Draggable */}
      <DraggableRecipeCell
        id={`protein-${dayIndex}`}
        recipeName={getRecipeName(dayPlan.proteinRecipeId, proteinRecipes)}
      >
        <SearchableSelect
          options={proteinOptions}
          value={dayPlan.proteinRecipeId}
          onChange={(value) => onRecipeChange(dayIndex, 'protein', value)}
          placeholder="Select..."
          accent="fuchsia"
        />
      </DraggableRecipeCell>

      {/* Carb Dropdown - Draggable */}
      <DraggableRecipeCell
        id={`carb-${dayIndex}`}
        recipeName={getRecipeName(dayPlan.carbRecipeId, carbRecipes)}
      >
        <SearchableSelect
          options={carbOptions}
          value={dayPlan.carbRecipeId}
          onChange={(value) => onRecipeChange(dayIndex, 'carb', value)}
          placeholder="Select..."
          accent="cyan"
        />
      </DraggableRecipeCell>

      {/* Vegetable Dropdown - Draggable */}
      <DraggableRecipeCell
        id={`vegetable-${dayIndex}`}
        recipeName={getRecipeName(dayPlan.vegetableRecipeId, vegetableRecipes)}
      >
        <SearchableSelect
          options={vegetableOptions}
          value={dayPlan.vegetableRecipeId}
          onChange={(value) => onRecipeChange(dayIndex, 'vegetable', value)}
          placeholder="Select..."
          accent="lime"
        />
      </DraggableRecipeCell>
    </div>
  )
}
