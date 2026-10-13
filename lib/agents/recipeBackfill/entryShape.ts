/** Checks the shape of a report row sent back by the admin page, before anything is applied. */

import type { ReportEntry } from './types'

const ACTIONS = ['enrich', 'quick', 'leave', 'duplicate']

export function isReportEntry(value: unknown): value is ReportEntry {
  const entry = value as Partial<ReportEntry> | null
  if (!entry || typeof entry !== 'object') return false
  if (typeof entry.recipeId !== 'string' || typeof entry.name !== 'string') return false
  if (typeof entry.action !== 'string' || !ACTIONS.includes(entry.action)) return false
  if (entry.action === 'enrich' && (typeof entry.changes !== 'object' || entry.changes === null)) return false
  if (entry.action === 'duplicate' && typeof entry.merge?.keeperId !== 'string') return false
  return true
}
