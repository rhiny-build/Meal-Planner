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
import type { PlanDay } from '@/lib/tonight'
import { formatDateParam } from '@/lib/dateUtils'
import WeekDayRow from './WeekDayRow'
import DaySwapSheet from './DaySwapSheet'

interface WeekListProps {
  weekPlan: WeekPlan[]
  dayNotes: Record<string, string>
  lunchRecipes: RecipeWithIngredients[]
  proteinRecipes: RecipeWithIngredients[]
  carbRecipes: RecipeWithIngredients[]
  vegetableRecipes: RecipeWithIngredients[]
  onRecipeChange: (dayIndex: number, column: MealSlotColumn, recipeId: string) => void
  onNoteChange: (day: string, note: string) => void
}

export default function WeekList({
  weekPlan,
  dayNotes,
  lunchRecipes,
  proteinRecipes,
  carbRecipes,
  vegetableRecipes,
  onRecipeChange,
  onNoteChange,
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
          const plan: PlanDay = {
            dayOfWeek: dayPlan.day,
            proteinRecipe: findRecipe(dayPlan.proteinRecipeId),
            carbRecipe: findRecipe(dayPlan.carbRecipeId),
            vegetableRecipe: findRecipe(dayPlan.vegetableRecipeId),
          }
          return (
            <WeekDayRow
              key={dayPlan.day}
              day={dayPlan.day}
              date={dayPlan.date}
              isToday={formatDateParam(dayPlan.date) === todayKey}
              plan={plan}
              lunchName={findRecipe(dayPlan.lunchRecipeId)?.name ?? null}
              note={dayNotes[dayPlan.day] ?? ''}
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
          onClose={() => setOpenDayIndex(null)}
        />
      )}
    </>
  )
}
