/**
 * MealPlanGrid Component
 *
 * 7-day grid table displaying the weekly meal plan with notes and meal columns.
 * Supports light and dark themes and drag-and-drop recipe swapping.
 *
 * === DRAG AND DROP ARCHITECTURE ===
 *
 * The grid uses @dnd-kit to enable swapping recipes between days within the same column.
 *
 * Structure:
 * - DndContext: Wraps the entire grid, manages drag state
 * - DraggableRecipeCell: Each recipe cell is both draggable and droppable
 *
 * Flow:
 * 1. User grabs the drag handle on a cell (e.g., Monday's protein)
 * 2. User drags over another cell in the same column (e.g., Thursday's protein)
 * 3. On drop, handleDragEnd extracts both cell IDs and calls onSwapRecipes
 * 4. The parent component swaps the recipe IDs in state
 *
 * Constraints:
 * - Can only swap within the same column (protein↔protein, not protein↔carb)
 * - Swapping with an empty cell effectively moves the recipe
 */

'use client'

import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { Recipe, WeekPlan } from '@/types'
import { formatDate } from '@/lib/dateUtils'
import SearchableSelect from '@/components/SearchableSelect'
import DraggableRecipeCell from './DraggableRecipeCell'
import { parseCellId, getRecipeName } from '../helpers/dndHelpers'

interface MealPlanGridProps {
  weekPlan: WeekPlan[]
  dayNotes: Record<string, string>
  lunchRecipes: Recipe[]
  proteinRecipes: Recipe[]
  carbRecipes: Recipe[]
  vegetableRecipes: Recipe[]
  onRecipeChange: (dayIndex: number, column: 'lunch' | 'protein' | 'carb' | 'vegetable', recipeId: string) => void
  onNoteChange: (day: string, note: string) => void
  /** Handler for swapping recipes between days via drag and drop */
  onSwapRecipes: (column: 'lunch' | 'protein' | 'carb' | 'vegetable', fromDayIndex: number, toDayIndex: number) => void
}

export default function MealPlanGrid({
  weekPlan,
  dayNotes,
  lunchRecipes,
  proteinRecipes,
  carbRecipes,
  vegetableRecipes,
  onRecipeChange,
  onNoteChange,
  onSwapRecipes,
}: MealPlanGridProps) {

  /**
   * Sensors configuration
   *
   * PointerSensor handles mouse and touch input. The activationConstraint
   * requires 8px of movement before a drag starts. This prevents accidental
   * drags when the user just wants to click the dropdown.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement required to start drag
      },
    })
  )

  /**
   * Handle drag end event
   *
   * Called when the user releases a dragged item. We check:
   * 1. Was it dropped on a valid target? (over exists)
   * 2. Are the source and target in the same column?
   * 3. Are they different cells? (not dropped back on itself)
   *
   * If all conditions pass, we call onSwapRecipes to swap the values.
   */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    // No valid drop target
    if (!over) return

    // Parse the cell IDs
    const activeCell = parseCellId(String(active.id))
    const overCell = parseCellId(String(over.id))

    // Invalid IDs
    if (!activeCell || !overCell) return

    // Different columns - don't swap across columns
    if (activeCell.column !== overCell.column) return

    // Same cell - dropped back on itself
    if (activeCell.dayIndex === overCell.dayIndex) return

    // Valid swap - call the handler
    onSwapRecipes(activeCell.column, activeCell.dayIndex, overCell.dayIndex)
  }

  // Convert recipes to options format for SearchableSelect
  const lunchOptions = lunchRecipes.map(recipe => ({
    value: String(recipe.id),
    label: recipe.name
  }))

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
    /**
     * DndContext - The root component for drag and drop
     *
     * - sensors: How drags are initiated (pointer with 8px activation distance)
     * - onDragEnd: Called when a drag operation completes
     *
     * All DraggableRecipeCell components inside will participate in drag operations.
     */
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        {/* Parent grid defines columns once - rows use subgrid to inherit them */}
        <div className="grid grid-cols-[80px_90px_150px_200px_200px_200px_200px] bg-white dark:bg-neutral-900 rounded-lg overflow-hidden shadow-md dark:shadow-xl">
          {/* Table Header - spans all columns, uses subgrid */}
          <div className="col-span-7 grid grid-cols-subgrid gap-4 px-5 py-3 bg-gray-100 dark:bg-neutral-800">
            <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Day</div>
            <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Date</div>
            <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Notes</div>
            <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Lunch</div>
            <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Protein</div>
            <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Carb</div>
            <div className="text-sm font-medium text-gray-600 dark:text-neutral-300">Vegetable</div>
          </div>

          {/* Table Rows - each spans all columns, uses subgrid */}
          {weekPlan.map((dayPlan, index) => (
            <div
              key={dayPlan.day}
              className={`col-span-7 grid grid-cols-subgrid gap-4 px-5 py-4 ${
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

            {/* Notes - not draggable */}
            <div>
              <input
                type="text"
                value={dayNotes[dayPlan.day] || ''}
                onChange={(e) => onNoteChange(dayPlan.day, e.target.value)}
                placeholder="Add note..."
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-neutral-800/50 border border-gray-300 dark:border-neutral-700 rounded text-gray-900 dark:text-neutral-100 focus:border-blue-500 focus:ring-0 focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-neutral-600"
              />
            </div>

            {/* Lunch Dropdown - Draggable */}
            <DraggableRecipeCell
              id={`lunch-${index}`}
              recipeName={getRecipeName(dayPlan.lunchRecipeId, lunchRecipes)}
            >
              <SearchableSelect
                options={lunchOptions}
                value={dayPlan.lunchRecipeId}
                onChange={(value) => onRecipeChange(index, 'lunch', value)}
                placeholder="Select..."
                accent="amber"
              />
            </DraggableRecipeCell>

            {/* Protein Dropdown - Draggable */}
            <DraggableRecipeCell
              id={`protein-${index}`}
              recipeName={getRecipeName(dayPlan.proteinRecipeId, proteinRecipes)}
            >
              <SearchableSelect
                options={proteinOptions}
                value={dayPlan.proteinRecipeId}
                onChange={(value) => onRecipeChange(index, 'protein', value)}
                placeholder="Select..."
                accent="fuchsia"
              />
            </DraggableRecipeCell>

            {/* Carb Dropdown - Draggable */}
            <DraggableRecipeCell
              id={`carb-${index}`}
              recipeName={getRecipeName(dayPlan.carbRecipeId, carbRecipes)}
            >
              <SearchableSelect
                options={carbOptions}
                value={dayPlan.carbRecipeId}
                onChange={(value) => onRecipeChange(index, 'carb', value)}
                placeholder="Select..."
                accent="cyan"
              />
            </DraggableRecipeCell>

            {/* Vegetable Dropdown - Draggable */}
            <DraggableRecipeCell
              id={`vegetable-${index}`}
              recipeName={getRecipeName(dayPlan.vegetableRecipeId, vegetableRecipes)}
            >
              <SearchableSelect
                options={vegetableOptions}
                value={dayPlan.vegetableRecipeId}
                onChange={(value) => onRecipeChange(index, 'vegetable', value)}
                placeholder="Select..."
                accent="lime"
              />
            </DraggableRecipeCell>
          </div>
        ))}
        </div>
      </div>
    </DndContext>
  )
}
