/**
 * useTonight Hook
 *
 * Loads the current week's meal plan and its day notes, and works out
 * tonight's dinner, today's note and the rest of the week (see lib/tonight.ts).
 * "Today" is the viewer's calendar day, not the server's.
 */

import { useCallback, useEffect, useState } from 'react'
import { getWeekStart, formatDateParam } from '@/lib/dateUtils'
import { getDayNotesForWeek } from '@/app/meal-plan/dayNoteActions'
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
      const [planResponse, notesByDate] = await Promise.all([
        fetch(`/api/meal-plan?startDate=${weekKey}`),
        getDayNotesForWeek(weekKey),
      ])
      if (!planResponse.ok) throw new Error('Could not load the meal plan')
      const { mealPlans } = (await planResponse.json()) as { mealPlans: PlanDay[] }
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
