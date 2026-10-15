/**
 * useNextWeekGaps Hook
 *
 * How many days of NEXT week (the week Draft my week fills) have no dinner
 * yet. While the page shows next week it counts from what is on screen, so
 * the hint follows edits; otherwise it asks for next week's plan once, after the page has loaded.
 */

import { useEffect, useState } from 'react'
import type { WeekPlan } from '@/types'
import { formatDateParam, getWeekStart } from '@/lib/dateUtils'
import { countDaysWithoutDinner } from '@/lib/weekGaps'

export function useNextWeekGaps(weekStartDay: number, viewedStart: Date, viewedPlan: WeekPlan[], isEnabled: boolean): number | null {
  const nextStart = getWeekStart(new Date(), weekStartDay)
  nextStart.setDate(nextStart.getDate() + 7)
  const nextKey = formatDateParam(nextStart)
  const isViewingNextWeek = formatDateParam(viewedStart) === nextKey
  const [fetchedCount, setFetchedCount] = useState<number | null>(null)

  useEffect(() => {
    // Not while the page itself is still loading: the hint is a nicety and must not compete with it
    if (isViewingNextWeek || !isEnabled) return
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch(`/api/meal-plan?startDate=${nextKey}`)
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) setFetchedCount(countDaysWithoutDinner(data.mealPlans))
      } catch {
        // the hint is a nicety: no hint beats an error
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isViewingNextWeek, isEnabled, nextKey])

  if (isViewingNextWeek) return viewedPlan.length > 0 ? countDaysWithoutDinner(viewedPlan) : null
  return fetchedCount
}
