/** Converting between the Week page's WeekPlan rows and draft days (pure, so it can be tested). */

import type { WeekPlan } from '@/types'
import { formatDateParam } from '@/lib/dateUtils'
import type { PlanDay } from './types'

/** Show a draft: every draft day replaces the saved day with the same date (the draft already holds the filled days). */
export function overlayDraft(weekPlan: WeekPlan[], draftDays: PlanDay[]): WeekPlan[] {
  const byDate = new Map(draftDays.map(d => [d.date, d]))
  return weekPlan.map(day => {
    const draftDay = byDate.get(formatDateParam(day.date))
    return draftDay
      ? {
          ...day,
          lunchRecipeId: draftDay.lunch ?? '',
          proteinRecipeId: draftDay.protein ?? '',
          carbRecipeId: draftDay.carb ?? '',
          vegetableRecipeId: draftDay.vegetable ?? '',
        }
      : day
  })
}

export function reasonsByDate(draftDays: PlanDay[]): Record<string, string> {
  return Object.fromEntries(draftDays.filter(d => d.reason).map(d => [d.date, d.reason as string]))
}

/** The week as it stands on screen, in the shape the server keeps drafts in. */
export function weekPlanToDays(weekPlan: WeekPlan[]): PlanDay[] {
  return weekPlan.map(day => ({
    date: formatDateParam(day.date),
    dayOfWeek: day.day,
    lunch: day.lunchRecipeId || null,
    protein: day.proteinRecipeId || null,
    carb: day.carbRecipeId || null,
    vegetable: day.vegetableRecipeId || null,
    reason: null,
    locked: [],
  }))
}
