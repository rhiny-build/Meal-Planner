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
import type { RecipeWithIngredients, WeekPlan } from '@/types'
import MealPlanGridRow from './MealPlanGridRow'
import MealPlanMobile from './MealPlanMobile'
import { parseCellId } from '../helpers/dndHelpers'
import { recipesToOptions } from '../helpers/gridHelpers'

interface MealPlanGridProps {
  weekPlan: WeekPlan[]
  dayNotes: Record<string, string>
  lunchRecipes: RecipeWithIngredients[]
  proteinRecipes: RecipeWithIngredients[]
  carbRecipes: RecipeWithIngredients[]
  vegetableRecipes: RecipeWithIngredients[]
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
  const lunchOptions = recipesToOptions(lunchRecipes)
  const proteinOptions = recipesToOptions(proteinRecipes)
  const carbOptions = recipesToOptions(carbRecipes)
  const vegetableOptions = recipesToOptions(vegetableRecipes)

  return (
    <>
      {/* Mobile view - hidden on md and up */}
      <div className="md:hidden">
        <MealPlanMobile
          weekPlan={weekPlan}
          lunchRecipes={lunchRecipes}
          proteinRecipes={proteinRecipes}
          carbRecipes={carbRecipes}
          vegetableRecipes={vegetableRecipes}
        />
      </div>

      {/* Desktop view - hidden on mobile */}
      <div className="hidden md:block">
        {/**
         * DndContext - The root component for drag and drop
         *
         * - sensors: How drags are initiated (pointer with 8px activation distance)
         * - onDragEnd: Called when a drag operation completes
         *
         * All DraggableRecipeCell components inside will participate in drag operations.
         */}
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="overflow-x-auto">
            {/* Parent grid defines columns once - rows use subgrid to inherit them */}
            <div className="grid grid-cols-[110px_70px_150px_200px_200px_200px_200px] bg-white dark:bg-neutral-900 rounded-lg overflow-hidden shadow-md dark:shadow-xl">
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

              {/* Table Rows */}
              {weekPlan.map((dayPlan, index) => (
                <MealPlanGridRow
                  key={dayPlan.day}
                  dayPlan={dayPlan}
                  dayIndex={index}
                  isLastRow={index === weekPlan.length - 1}
                  dayNote={dayNotes[dayPlan.day] || ''}
                  lunchOptions={lunchOptions}
                  proteinOptions={proteinOptions}
                  carbOptions={carbOptions}
                  vegetableOptions={vegetableOptions}
                  lunchRecipes={lunchRecipes}
                  proteinRecipes={proteinRecipes}
                  carbRecipes={carbRecipes}
                  vegetableRecipes={vegetableRecipes}
                  onRecipeChange={onRecipeChange}
                  onNoteChange={onNoteChange}
                />
              ))}
            </div>
          </div>
        </DndContext>
      </div>
    </>
  )
}
