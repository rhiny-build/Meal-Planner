/**
 * One-off migration: day notes used to live in localStorage under
 * `mealPlanNotes_<weekStart>` (value: JSON { [dayName]: text }).
 *
 * Pushes notes for the current or a future week to the DB, then removes the key.
 * Keys for past weeks are left alone (the old code deleted those anyway).
 *
 * REMOVABLE: delete this file and its call in useDayNotes once every device
 * has loaded the app after the S02 deploy (a few weeks is plenty).
 */

import { getOrderedDays } from '@/lib/mealPlanHelpers'
import { formatDateParam } from '@/lib/dateUtils'
import { saveDayNote } from '@/app/meal-plan/dayNoteActions'

const KEY_PREFIX = 'mealPlanNotes_'

export async function migrateLocalStorageNotes(): Promise<void> {
  if (typeof window === 'undefined') return

  const today = formatDateParam(new Date())

  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(KEY_PREFIX)) keys.push(key)
  }

  for (const key of keys) {
    const weekStart = key.slice(KEY_PREFIX.length)
    const [y, m, d] = weekStart.split('-').map(Number)
    const start = new Date(y, m - 1, d)
    // Week is past once its last day (start + 6) is before today
    if (formatDateParam(new Date(y, m - 1, d + 6)) < today) continue
    // The key's own weekday is the week-start day it was saved with
    const dayNames = getOrderedDays(start.getDay())

    try {
      const notes: Record<string, string> = JSON.parse(localStorage.getItem(key) ?? '{}')
      for (const [dayName, text] of Object.entries(notes)) {
        const index = dayNames.indexOf(dayName)
        if (index === -1 || !text?.trim()) continue
        const date = formatDateParam(new Date(y, m - 1, d + index))
        await saveDayNote(date, text)
      }
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to migrate day notes from', key, error)
    }
  }
}
