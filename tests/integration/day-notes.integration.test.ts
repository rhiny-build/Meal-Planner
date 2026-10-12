/**
 * Day Note Integration Tests
 *
 * Runs the real server actions against the test database to confirm that
 * calendar days round-trip without an off-by-one shift.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { testPrisma, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'
import { getDayNotesForWeek, saveDayNote } from '@/app/meal-plan/dayNoteActions'

describe('Day Note Integration Tests', () => {
  beforeAll(async () => { await setupTestDatabase() })
  afterAll(async () => { await teardownTestDatabase() })
  beforeEach(async () => { await clearTestDatabase() })

  it('saves, reads back by week, updates and deletes a note', async () => {
    await saveDayNote('2026-10-12', 'football till 7')
    await saveDayNote('2026-10-18', 'out')
    await saveDayNote('2026-10-19', 'next week') // outside the week

    expect(await getDayNotesForWeek('2026-10-12')).toEqual({
      '2026-10-12': 'football till 7',
      '2026-10-18': 'out',
    })

    await saveDayNote('2026-10-12', 'football cancelled')
    expect((await getDayNotesForWeek('2026-10-12'))['2026-10-12']).toBe('football cancelled')
    expect(await testPrisma.dayNote.count()).toBe(3)

    await saveDayNote('2026-10-12', '')
    expect((await getDayNotesForWeek('2026-10-12'))['2026-10-12']).toBeUndefined()
    expect(await testPrisma.dayNote.count()).toBe(2)
  })
})
