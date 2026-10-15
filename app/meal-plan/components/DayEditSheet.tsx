/**
 * DayEditSheet
 *
 * The day editor: a searchable dropdown for each meal slot (lunch, protein,
 * carb, vegetable) plus the day's note, shown as a bottom sheet on phones and
 * a dialog on desktop. "Swap with another day" in words swaps a slot (or the
 * whole dinner) with another day. Changes apply to the week plan straight
 * away; "Save plan" on the page stores them.
 */

'use client'

import { useEffect, useState } from 'react'
import type { RecipeWithIngredients, WeekPlan } from '@/types'
import type { MealSlotColumn } from '@/lib/mealPlanHelpers'
import SearchableSelect from '@/components/SearchableSelect'
import Button from '@/components/Button'
import { recipesToOptions } from '../helpers/gridHelpers'

type SwapSlot = MealSlotColumn | 'dinner'

const DINNER_SLOTS: MealSlotColumn[] = ['protein', 'carb', 'vegetable']

interface DayEditSheetProps {
  dayIndex: number
  dayPlan: WeekPlan
  note: string
  lunchRecipes: RecipeWithIngredients[]
  proteinRecipes: RecipeWithIngredients[]
  carbRecipes: RecipeWithIngredients[]
  vegetableRecipes: RecipeWithIngredients[]
  onRecipeChange: (dayIndex: number, column: MealSlotColumn, recipeId: string) => void
  onNoteChange: (day: string, note: string) => void
  onSwapRecipes: (column: MealSlotColumn, fromDayIndex: number, toDayIndex: number) => void
  /** Names of every day in the week, in order (for "swap with another day"). */
  dayNames: string[]
  onClose: () => void
}

export default function DayEditSheet({
  dayIndex,
  dayPlan,
  note,
  lunchRecipes,
  proteinRecipes,
  carbRecipes,
  vegetableRecipes,
  onRecipeChange,
  onNoteChange,
  onSwapRecipes,
  dayNames,
  onClose,
}: DayEditSheetProps) {
  const [swapSlot, setSwapSlot] = useState<SwapSlot>('dinner')
  const [swapDayIndex, setSwapDayIndex] = useState<number | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const slots: { column: MealSlotColumn; label: string; recipes: RecipeWithIngredients[]; value: string }[] = [
    { column: 'protein', label: 'Protein', recipes: proteinRecipes, value: dayPlan.proteinRecipeId },
    { column: 'carb', label: 'Carb', recipes: carbRecipes, value: dayPlan.carbRecipeId },
    { column: 'vegetable', label: 'Vegetable', recipes: vegetableRecipes, value: dayPlan.vegetableRecipeId },
    { column: 'lunch', label: 'Lunch', recipes: lunchRecipes, value: dayPlan.lunchRecipeId },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" data-testid="day-edit-sheet">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${dayPlan.day}`}
        className="relative w-full md:max-w-lg bg-surface rounded-t-panel md:rounded-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
      >
        <h2 className="font-display text-2xl font-bold text-ink">{dayPlan.day}</h2>
        {slots.map((slot) => (
          <div key={slot.column} className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-ink-soft">{slot.label}</span>
            <SearchableSelect
              options={recipesToOptions(slot.recipes)}
              value={slot.value}
              onChange={(value) => onRecipeChange(dayIndex, slot.column, value)}
              placeholder="Select..."
              ariaLabel={`${slot.label} for ${dayPlan.day}`}
            />
          </div>
        ))}
        <div className="flex flex-col gap-1">
          <label htmlFor="day-note" className="text-sm font-semibold text-ink-soft">
            Note
          </label>
          <input
            id="day-note"
            type="text"
            value={note}
            onChange={(event) => onNoteChange(dayPlan.day, event.target.value)}
            placeholder="e.g. football till 7"
            className="min-h-11 px-3 rounded-card bg-ground border border-line text-ink placeholder:text-ink-soft focus:outline-none focus:border-primary"
          />
        </div>
        <fieldset className="flex flex-col gap-2 border-t border-line pt-4">
          <legend className="text-sm font-semibold text-ink-soft pb-1">Swap with another day</legend>
          <div className="flex gap-2">
            <select
              aria-label="What to swap"
              value={swapSlot}
              onChange={(event) => setSwapSlot(event.target.value as SwapSlot)}
              className="flex-1 min-h-11 px-3 rounded-card bg-surface border border-line text-ink"
            >
              <option value="dinner">Whole dinner</option>
              {slots.map((slot) => (
                <option key={slot.column} value={slot.column}>
                  {slot.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Swap with day"
              value={swapDayIndex ?? ''}
              onChange={(event) => setSwapDayIndex(event.target.value === '' ? null : Number(event.target.value))}
              className="flex-1 min-h-11 px-3 rounded-card bg-surface border border-line text-ink"
            >
              <option value="">Day...</option>
              {dayNames.map((name, index) =>
                index === dayIndex ? null : (
                  <option key={name} value={index}>
                    {name}
                  </option>
                )
              )}
            </select>
          </div>
          <Button
            variant="secondary"
            disabled={swapDayIndex === null}
            onClick={() => {
              if (swapDayIndex === null) return
              const columns = swapSlot === 'dinner' ? DINNER_SLOTS : [swapSlot]
              columns.forEach((column) => onSwapRecipes(column, dayIndex, swapDayIndex))
              setSwapDayIndex(null)
            }}
          >
            Swap
          </Button>
        </fieldset>
        <Button size="lg" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  )
}
