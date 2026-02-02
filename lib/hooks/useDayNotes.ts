/**
 * useDayNotes Hook
 *
 * Manages day notes with localStorage persistence.
 * Notes are automatically cleared when the week has passed.
 */

import { useState, useEffect } from 'react'
import { isWeekPast } from '@/lib/dateUtils'

type DayNotes = Record<string, string>

function getNotesStorageKey(startDate: Date): string {
  return `mealPlanNotes_${startDate.toISOString().split('T')[0]}`
}

export function useDayNotes(startDate: Date) {
  const [dayNotes, setDayNotes] = useState<DayNotes>({})

  // Load notes from localStorage on mount and when date changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const storageKey = getNotesStorageKey(startDate)

    // Clear notes for past weeks
    if (isWeekPast(startDate)) {
      localStorage.removeItem(storageKey)
      setDayNotes({})
      return
    }

    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        setDayNotes(JSON.parse(stored))
      } catch {
        setDayNotes({})
      }
    } else {
      setDayNotes({})
    }
  }, [startDate])

  // Save notes to localStorage when they change
  const handleNoteChange = (day: string, note: string) => {
    const newNotes = { ...dayNotes, [day]: note }
    setDayNotes(newNotes)
    if (typeof window !== 'undefined') {
      localStorage.setItem(getNotesStorageKey(startDate), JSON.stringify(newNotes))
    }
  }

  return {
    dayNotes,
    handleNoteChange,
  }
}
