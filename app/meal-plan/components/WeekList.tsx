/**
 * WeekList
 *
 * The week as one row per day (see Week mockup), each with a swap button.
 * Owns which day's change sheet is open; `?day=Tuesday` opens it on arrival
 * (that is where Tonight's swap button goes).
 */

'use client'

import { useEffect, useState } from 'react'
import type { RecipeWithIngredients, WeekPlan } from '@/types'
import type { MealSlotColumn } from '@/lib/mealPlanHelpers'
import { formatDateParam } from '@/lib/dateUtils'
import WeekDayRow from './WeekDayRow'
import type { DaySlots } from './WeekDayDetails'
import DaySwapSheet from './DaySwapSheet'

interface WeekListProps {
  weekPlan: WeekPlan[]
  dayNotes: Record<string, string>
  /** Draft reasons by date (YYYY-MM-DD) */
  reasons?: Record<string, string>
  lunchRecipes: RecipeWithIngredients[]
  proteinRecipes: RecipeWithIngredients[]
  carbRecipes: RecipeWithIngredients[]
  vegetableRecipes: RecipeWithIngredients[]
  onRecipeChange: (dayIndex: number, column: MealSlotColumn, recipeId: string) => void
  onNoteChange: (day: string, note: string) => void
  onSwapRecipes: (column: MealSlotColumn, fromDayIndex: number, toDayIndex: number) => void
}

export default function WeekList({
  weekPlan,
  dayNotes,
  reasons = {},
  lunchRecipes,
  proteinRecipes,
  carbRecipes,
  vegetableRecipes,
  onRecipeChange,
  onNoteChange,
  onSwapRecipes,
}: WeekListProps) {
  const [openDayIndex, setOpenDayIndex] = useState<number | null>(null)
  const [hasHandledDayParam, setHasHandledDayParam] = useState(false)

  useEffect(() => {
    if (hasHandledDayParam || weekPlan.length === 0) return
    setHasHandledDayParam(true)
    const requestedDay = new URLSearchParams(window.location.search).get('day')
    const index = weekPlan.findIndex((dayPlan) => dayPlan.day === requestedDay)
    if (index !== -1) setOpenDayIndex(index)
  }, [weekPlan, hasHandledDayParam])

  const allRecipes = [...lunchRecipes, ...proteinRecipes, ...carbRecipes, ...vegetableRecipes]
  const findRecipe = (id: string) => (id ? allRecipes.find((recipe) => recipe.id === id) ?? null : null)
  const todayKey = formatDateParam(new Date())

  return (
    <>
      <ul className="flex flex-col gap-2" data-testid="week-list">
        {weekPlan.map((dayPlan, index) => {
          const slots: DaySlots = {
            lunch: findRecipe(dayPlan.lunchRecipeId),
            protein: findRecipe(dayPlan.proteinRecipeId),
            carb: findRecipe(dayPlan.carbRecipeId),
            vegetable: findRecipe(dayPlan.vegetableRecipeId),
          }
          return (
            <WeekDayRow
              key={dayPlan.day}
              day={dayPlan.day}
              date={dayPlan.date}
              isToday={formatDateParam(dayPlan.date) === todayKey}
              slots={slots}
              note={dayNotes[dayPlan.day] ?? ''}
              reason={reasons[formatDateParam(dayPlan.date)]}
              onSwap={() => setOpenDayIndex(index)}
            />
          )
        })}
      </ul>

      {openDayIndex !== null && weekPlan[openDayIndex] && (
        <DaySwapSheet
          dayIndex={openDayIndex}
          dayPlan={weekPlan[openDayIndex]}
          note={dayNotes[weekPlan[openDayIndex].day] ?? ''}
          lunchRecipes={lunchRecipes}
          proteinRecipes={proteinRecipes}
          carbRecipes={carbRecipes}
          vegetableRecipes={vegetableRecipes}
          onRecipeChange={onRecipeChange}
          onNoteChange={onNoteChange}
          onSwapRecipes={onSwapRecipes}
          dayNames={weekPlan.map((dayPlan) => dayPlan.day)}
          onClose={() => setOpenDayIndex(null)}
        />
      )}
    </>
  )
}
