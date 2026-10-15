'use server'

/**
 * Day Note Server Actions
 *
 * Free-text notes for a calendar day on the meal-plan grid.
 * Dates cross the server boundary as 'YYYY-MM-DD' strings (see formatDateParam)
 * and are stored in a DATE column, so no timezone can shift the day.
 */

import { prisma } from '@/lib/prisma'
import { measured } from '@/lib/timing/measure'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** 'YYYY-MM-DD' -> Date at UTC midnight (what a Postgres DATE column round-trips as). */
function toStoredDate(dateStr: string): Date {
  if (!DATE_PATTERN.test(dateStr)) {
    throw new Error(`Invalid date: ${dateStr}`)
  }
  const stored = new Date(`${dateStr}T00:00:00.000Z`)
  // Reject impossible days like 2026-02-31 (JS would silently roll them into March)
  if (Number.isNaN(stored.getTime()) || fromStoredDate(stored) !== dateStr) {
    throw new Error(`Invalid date: ${dateStr}`)
  }
  return stored
}

/** Stored UTC-midnight Date -> 'YYYY-MM-DD'. */
function fromStoredDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Get the notes for the 7 days starting at weekStart.
 * Returns a map of 'YYYY-MM-DD' -> note text (days without a note are absent).
 */
async function getDayNotesForWeekImpl(weekStart: string): Promise<Record<string, string>> {
  const from = toStoredDate(weekStart)
  const to = new Date(from)
  to.setUTCDate(to.getUTCDate() + 6)

  const rows = await prisma.dayNote.findMany({
    where: { date: { gte: from, lte: to } },
  })

  return Object.fromEntries(rows.map(row => [fromStoredDate(row.date), row.text]))
}

/**
 * Save the note for one day. Empty (or whitespace-only) text deletes the note.
 */
async function saveDayNoteImpl(date: string, text: string): Promise<void> {
  const stored = toStoredDate(date)

  if (!text.trim()) {
    await prisma.dayNote.deleteMany({ where: { date: stored } })
    return
  }

  await prisma.dayNote.upsert({
    where: { date: stored },
    create: { date: stored, text },
    update: { text },
  })
}

export const getDayNotesForWeek = measured('action', 'action getDayNotesForWeek', getDayNotesForWeekImpl)

export const saveDayNote = measured('action', 'action saveDayNote', saveDayNoteImpl)
