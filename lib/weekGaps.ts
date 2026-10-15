/**
 * Days without a dinner
 *
 * A day counts as empty when none of its dinner slots (protein, carb,
 * vegetable) is filled; lunch is not dinner. Draft my week fills exactly
 * these days, so the Week page uses this to hint "add notes first".
 */

type DinnerSlots = {
  proteinRecipeId?: string | null
  carbRecipeId?: string | null
  vegetableRecipeId?: string | null
}

export function countDaysWithoutDinner(days: DinnerSlots[]): number {
  return days.filter((day) => !day.proteinRecipeId && !day.carbRecipeId && !day.vegetableRecipeId).length
}
