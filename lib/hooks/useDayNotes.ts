/**
 * useDayNotes Hook
 *
 * Manages day notes for the week, persisted in the database via server actions.
 * Notes are keyed by day name ("Monday") in the component API; the hook maps
 * each day name to its calendar date for storage. History is kept (nothing is
 * cleared when a week passes).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { formatDateParam } from '@/lib/dateUtils'
import { getDayNotesForWeek, saveDayNote } from '@/app/meal-plan/dayNoteActions'
import { migrateLocalStorageNotes } from './migrateLocalStorageNotes'

type DayNotes = Record<string, string>

const SAVE_DEBOUNCE_MS = 600

export function useDayNotes(startDate: Date, days: string[]) {
  const [dayNotes, setDayNotes] = useState<DayNotes>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Text typed but not yet sent, by date. Flushed on unmount / tab hide so a quick navigate or reload loses nothing.
  const pending = useRef<Record<string, string>>({})
  const weekKey = formatDateParam(startDate)
  const daysKey = days.join(',')

  const dateForDay = useCallback((day: string): string => {
    const index = days.indexOf(day)
    const date = new Date(startDate)
    date.setDate(date.getDate() + index)
    return formatDateParam(date)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekKey, daysKey])

  const persist = useCallback((date: string, note: string) => {
    saveDayNote(date, note).catch(error => {
      console.error('Error saving day note:', error)
      toast.error('Could not save your note. Check your connection and try again.', { id: 'day-note-save-error' })
    })
  }, [])

  const flushPending = useCallback(() => {
    for (const [date, note] of Object.entries(pending.current)) {
      clearTimeout(timers.current[date])
      delete pending.current[date]
      persist(date, note)
    }
  }, [persist])

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushPending() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flushPending)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flushPending)
      flushPending()
    }
  }, [flushPending])

  // Load the week's notes (after pulling in any old localStorage notes, once)
  useEffect(() => {
    let cancelled = false
    setDayNotes({}) // don't show the previous week's notes while this week loads
    const load = async () => {
      try {
        await migrateLocalStorageNotes(days)
        const byDate = await getDayNotesForWeek(weekKey)
        if (cancelled) return
        const byDay: DayNotes = {}
        for (const day of days) {
          const date = dateForDay(day)
          if (date in pending.current) { byDay[day] = pending.current[date]; continue } // typed before load finished
          const note = byDate[date]
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
    pending.current[date] = note
    clearTimeout(timers.current[date])
    timers.current[date] = setTimeout(() => {
      delete pending.current[date]
      persist(date, note)
    }, SAVE_DEBOUNCE_MS)
  }

  return {
    dayNotes,
    handleNoteChange,
  }
}
