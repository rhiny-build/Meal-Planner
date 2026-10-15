/**
 * useTonight Hook
 *
 * Loads the current week's meal plan and its day notes (one request), and works out
 * tonight's dinner, today's note and the rest of the week (see lib/tonight.ts).
 * "Today" is the viewer's calendar day, not the server's.
 */

import { useCallback, useEffect, useState } from 'react'
import { getWeekStart, formatDateParam } from '@/lib/dateUtils'
import { useAutoRefresh } from './useAutoRefresh'
import { findPlanForDay, getDinner, getRestOfWeek, type Dinner, type PlanDay } from '@/lib/tonight'

export type TonightState = {
  isLoading: boolean
  hasError: boolean
  today: Date | null
  dinner: Dinner | null
  dayNote: string
  restOfWeek: PlanDay[]
}

const LOADING_STATE: TonightState = {
  isLoading: true,
  hasError: false,
  today: null,
  dinner: null,
  dayNote: '',
  restOfWeek: [],
}

export function useTonight(weekStartDay: number): TonightState {
  const [state, setState] = useState<TonightState>(LOADING_STATE)

  const load = useCallback(async () => {
    const today = new Date()
    const weekStart = getWeekStart(today, weekStartDay)
    const weekKey = formatDateParam(weekStart)
    try {
      // One request: the plan comes with the week's day notes
      const planResponse = await fetch(`/api/meal-plan?startDate=${weekKey}`)
      if (!planResponse.ok) throw new Error('Could not load the meal plan')
      const { mealPlans, dayNotes: notesByDate = {} } = (await planResponse.json()) as {
        mealPlans: PlanDay[]
        dayNotes?: Record<string, string>
      }
      setState({
        isLoading: false,
        hasError: false,
        today,
        dinner: getDinner(findPlanForDay(mealPlans, today)),
        dayNote: notesByDate[formatDateParam(today)] ?? '',
        restOfWeek: getRestOfWeek(mealPlans, today),
      })
    } catch (error) {
      console.error('Error loading tonight:', error)
      setState({ ...LOADING_STATE, isLoading: false, hasError: true, today })
    }
  }, [weekStartDay])

  useEffect(() => {
    load()
  }, [load])
  useAutoRefresh(load)

  return state
}
