/**
 * WeekDayDetails
 *
 * What opens under a day in the week list: every slot of the day (lunch,
 * protein, carb, vegetable) with its recipe and ingredients, so the day can
 * be checked without leaving the page.
 */

import Link from 'next/link'
import type { RecipeWithIngredients } from '@/types'
import type { MealSlotColumn } from '@/lib/mealPlanHelpers'

export const SLOT_LABELS: Record<MealSlotColumn, string> = {
  protein: 'Protein',
  carb: 'Carb',
  vegetable: 'Vegetable',
  lunch: 'Lunch',
}

export type DaySlots = Record<MealSlotColumn, RecipeWithIngredients | null>

const SLOT_ORDER: MealSlotColumn[] = ['protein', 'carb', 'vegetable', 'lunch']

interface WeekDayDetailsProps {
  day: string
  slots: DaySlots
}

export default function WeekDayDetails({ day, slots }: WeekDayDetailsProps) {
  return (
    <div className="mt-3 pt-3 border-t border-line flex flex-col gap-3" data-testid="week-day-details" aria-label={`${day} details`}>
      {SLOT_ORDER.map((slot) => {
        const recipe = slots[slot]
        if (!recipe) {
          return (
            <p key={slot} className="text-sm text-ink-soft">
              <span className="font-semibold">{SLOT_LABELS[slot]}:</span> none selected
            </p>
          )
        }
        const ingredients = recipe.structuredIngredients ?? []
        return (
          <div key={slot} className="flex flex-col gap-1">
            <p className="text-sm text-ink-soft">
              <span className="font-semibold">{SLOT_LABELS[slot]}:</span>{' '}
              <Link href={`/recipes/${recipe.id}`} className="font-semibold text-primary underline">
                {recipe.name}
              </Link>
              {recipe.recipeUrl && (
                <>
                  {' · '}
                  <a href={recipe.recipeUrl} target="_blank" rel="noopener noreferrer" className="underline">
                    source
                  </a>
                </>
              )}
            </p>
            {ingredients.length > 0 ? (
              <ul className="text-sm text-ink-soft list-disc ml-5 space-y-0.5">
                {ingredients.map((ingredient) => (
                  <li key={ingredient.id}>
                    {[ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(' ')}
                    {ingredient.notes && <span> ({ingredient.notes})</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft italic">No ingredients listed</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
