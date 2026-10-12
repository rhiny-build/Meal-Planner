import { describe, it, expect, vi, beforeEach } from 'vitest'

const { findMany, upsert, deleteMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
}))
vi.mock('@/lib/prisma', () => ({ prisma: { dayNote: { findMany, upsert, deleteMany } } }))

import { getDayNotesForWeek, saveDayNote } from './dayNoteActions'

const utc = (s: string) => new Date(`${s}T00:00:00.000Z`)

describe('dayNoteActions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads the 7-day range and returns notes keyed by YYYY-MM-DD', async () => {
    findMany.mockResolvedValue([
      { date: utc('2026-10-12'), text: 'football till 7' },
      { date: utc('2026-10-15'), text: 'out' },
    ])
    const result = await getDayNotesForWeek('2026-10-12')
    expect(findMany).toHaveBeenCalledWith({
      where: { date: { gte: utc('2026-10-12'), lte: utc('2026-10-18') } },
    })
    expect(result).toEqual({ '2026-10-12': 'football till 7', '2026-10-15': 'out' })
  })

  it('range crosses month boundaries correctly', async () => {
    findMany.mockResolvedValue([])
    await getDayNotesForWeek('2026-10-28')
    expect(findMany.mock.calls[0][0].where.date.lte).toEqual(utc('2026-11-03'))
  })

  it('upserts non-empty text at UTC midnight of the given day', async () => {
    await saveDayNote('2026-10-14', 'late meeting')
    expect(upsert).toHaveBeenCalledWith({
      where: { date: utc('2026-10-14') },
      create: { date: utc('2026-10-14'), text: 'late meeting' },
      update: { text: 'late meeting' },
    })
    expect(deleteMany).not.toHaveBeenCalled()
  })

  it('deletes the row when text is empty or whitespace', async () => {
    await saveDayNote('2026-10-14', '   ')
    expect(deleteMany).toHaveBeenCalledWith({ where: { date: utc('2026-10-14') } })
    expect(upsert).not.toHaveBeenCalled()
  })

  it('rejects malformed dates', async () => {
    await expect(saveDayNote('14/10/2026', 'x')).rejects.toThrow('Invalid date')
    await expect(getDayNotesForWeek('nope')).rejects.toThrow('Invalid date')
  })
})
