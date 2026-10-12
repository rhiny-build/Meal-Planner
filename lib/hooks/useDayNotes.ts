/**
 * useDayNotes Hook
 *
 * Manages day notes for the week, persisted in the database via server actions.
 * Notes are keyed by day name ("Monday") in the component API; the hook maps
 * each day name to its calendar date for storage. History is kept (nothing is
 * cleared when a week passes).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDateParam } from '@/lib/dateUtils'
import { getDayNotesForWeek, saveDayNote } from '@/app/meal-plan/dayNoteActions'
import { migrateLocalStorageNotes } from './migrateLocalStorageNotes'

type DayNotes = Record<string, string>

const SAVE_DEBOUNCE_MS = 600

export function useDayNotes(startDate: Date, days: string[]) {
  const [dayNotes, setDayNotes] = useState<DayNotes>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const weekKey = formatDateParam(startDate)
  const daysKey = days.join(',')

  const dateForDay = useCallback((day: string): string => {
    const index = days.indexOf(day)
    const date = new Date(startDate)
    date.setDate(date.getDate() + index)
    return formatDateParam(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, daysKey])

  // Load the week's notes (after pulling in any old localStorage notes, once)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        await migrateLocalStorageNotes()
        const byDate = await getDayNotesForWeek(weekKey)
        if (cancelled) return
        const byDay: DayNotes = {}
        for (const day of days) {
          const note = byDate[dateForDay(day)]
          if (note) byDay[day] = note
        }
        setDayNotes(byDay)
      } catch (error) {
        console.error('Error loading day notes:', error)
      }
    }
    load()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, daysKey])

  const handleNoteChange = (day: string, note: string) => {
    setDayNotes(prev => ({ ...prev, [day]: note }))

    const date = dateForDay(day)
    clearTimeout(timers.current[date])
    timers.current[date] = setTimeout(() => {
      saveDayNote(date, note).catch(error => console.error('Error saving day note:', error))
    }, SAVE_DEBOUNCE_MS)
  }

  return {
    dayNotes,
    handleNoteChange,
  }
}
