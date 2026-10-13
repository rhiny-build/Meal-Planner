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

import { formatDateParam } from '@/lib/dateUtils'
import { getDayNotesForWeek, saveDayNote } from '@/app/meal-plan/dayNoteActions'

const KEY_PREFIX = 'mealPlanNotes_'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/**
 * The old key date was `startDate.toISOString()` (UTC), so east of UTC (e.g. UK summer time)
 * it is the day BEFORE the real local week start. The real start is the key date or the next
 * day, whichever falls on the user's week-start day (`firstDayName`). Returns null if neither does.
 */
function realWeekStart(keyDate: string, firstDayName: string): Date | null {
  const [y, m, d] = keyDate.split('-').map(Number)
  for (const offset of [0, 1]) {
    const candidate = new Date(y, m - 1, d + offset)
    if (DAY_NAMES[candidate.getDay()] === firstDayName) return candidate
  }
  return null
}

/** @param days the week's day names in display order; days[0] is the week-start day. */
export async function migrateLocalStorageNotes(days: string[]): Promise<void> {
  if (typeof window === 'undefined') return

  const today = formatDateParam(new Date())

  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(KEY_PREFIX)) keys.push(key)
  }

  for (const key of keys) {
    const start = realWeekStart(key.slice(KEY_PREFIX.length), days[0])
    if (!start) continue
    const [y, m, d] = [start.getFullYear(), start.getMonth(), start.getDate()]
    // Week is past once its last day (start + 6) is before today
    if (formatDateParam(new Date(y, m, d + 6)) < today) continue
    const dayNames = days

    try {
      const notes: Record<string, string> = JSON.parse(localStorage.getItem(key) ?? '{}')
      // Never overwrite a note already in the DB (e.g. edited on another device)
      const existing = await getDayNotesForWeek(formatDateParam(start))
      for (const [dayName, text] of Object.entries(notes)) {
        const index = dayNames.indexOf(dayName)
        if (index === -1 || !text?.trim()) continue
        const date = formatDateParam(new Date(y, m, d + index))
        if (existing[date]) continue
        await saveDayNote(date, text)
      }
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to migrate day notes from', key, error)
    }
  }
}
