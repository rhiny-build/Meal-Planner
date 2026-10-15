/**
 * useNextWeekGaps Hook
 *
 * How many days of NEXT week (the week Draft my week fills) have no dinner
 * yet. While the page shows next week it counts from what is on screen, so
 * the hint follows edits; otherwise it asks for next week's plan once.
 */

import { useEffect, useState } from 'react'
import type { WeekPlan } from '@/types'
import { formatDateParam, getWeekStart } from '@/lib/dateUtils'
import { countDaysWithoutDinner } from '@/lib/weekGaps'

export function useNextWeekGaps(weekStartDay: number, viewedStart: Date, viewedPlan: WeekPlan[]): number | null {
  const nextStart = getWeekStart(new Date(), weekStartDay)
  nextStart.setDate(nextStart.getDate() + 7)
  const nextKey = formatDateParam(nextStart)
  const isViewingNextWeek = formatDateParam(viewedStart) === nextKey
  const [fetchedCount, setFetchedCount] = useState<number | null>(null)

  useEffect(() => {
    if (isViewingNextWeek) return
    let cancelled = false
    fetch(`/api/meal-plan?startDate=${nextKey}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) setFetchedCount(countDaysWithoutDinner(data.mealPlans))
      })
      .catch(() => {}) // the hint is a nicety: no hint beats an error
    return () => {
      cancelled = true
    }
  }, [isViewingNextWeek, nextKey])

  if (isViewingNextWeek) return viewedPlan.length > 0 ? countDaysWithoutDinner(viewedPlan) : null
  return fetchedCount
}
