import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const { getDayNotesForWeek, saveDayNote } = vi.hoisted(() => ({
  getDayNotesForWeek: vi.fn(),
  saveDayNote: vi.fn(),
}))
const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: toastError } }))
vi.mock('@/app/meal-plan/dayNoteActions', () => ({ getDayNotesForWeek, saveDayNote }))

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }
})()
vi.stubGlobal('localStorage', localStorageMock)

import { useDayNotes } from './useDayNotes'
import { getOrderedDays } from '@/lib/mealPlanHelpers'

const days = getOrderedDays(1)
const monday = new Date(2026, 9, 12) // Mon 12 Oct 2026

describe('useDayNotes', () => {
  beforeEach(() => {
    localStorageMock.clear()
    getDayNotesForWeek.mockReset().mockResolvedValue({})
    toastError.mockReset()
    saveDayNote.mockReset().mockResolvedValue(undefined)
  })
  afterEach(() => vi.useRealTimers())

  it('loads notes from the DB and maps dates to day names', async () => {
    getDayNotesForWeek.mockResolvedValue({ '2026-10-12': 'football', '2026-10-14': 'out' })
    const { result } = renderHook(() => useDayNotes(monday, days))
    await waitFor(() => expect(result.current.dayNotes).toEqual({ Monday: 'football', Wednesday: 'out' }))
    expect(getDayNotesForWeek).toHaveBeenCalledWith('2026-10-12')
  })

  it('shows past weeks too (history is kept)', async () => {
    const past = new Date(2025, 0, 6)
    getDayNotesForWeek.mockResolvedValue({ '2025-01-06': 'old note' })
    const { result } = renderHook(() => useDayNotes(past, days))
    await waitFor(() => expect(result.current.dayNotes).toEqual({ Monday: 'old note' }))
  })

  it('updates immediately and saves once, debounced, to the right date', async () => {
    const { result } = renderHook(() => useDayNotes(monday, days))
    await waitFor(() => expect(getDayNotesForWeek).toHaveBeenCalled())
    vi.useFakeTimers()
    act(() => { result.current.handleNoteChange('Thursday', 'o') })
    act(() => { result.current.handleNoteChange('Thursday', 'out') })
    expect(result.current.dayNotes.Thursday).toBe('out')
    expect(saveDayNote).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(700) })
    expect(saveDayNote).toHaveBeenCalledTimes(1)
    expect(saveDayNote).toHaveBeenCalledWith('2026-10-15', 'out')
  })

  it('migrates current/future localStorage notes, removes the key, leaves past weeks', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 14))
    localStorage.setItem('mealPlanNotes_2026-10-12', JSON.stringify({ Tuesday: 'dentist', Friday: '' }))
    localStorage.setItem('mealPlanNotes_2026-10-19', JSON.stringify({ Monday: 'next week' }))
    localStorage.setItem('mealPlanNotes_2026-10-05', JSON.stringify({ Monday: 'past' }))
    renderHook(() => useDayNotes(monday, days))
    await waitFor(() => expect(getDayNotesForWeek).toHaveBeenCalled())
    expect(saveDayNote).toHaveBeenCalledWith('2026-10-13', 'dentist')
    expect(saveDayNote).toHaveBeenCalledWith('2026-10-19', 'next week')
    expect(saveDayNote).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem('mealPlanNotes_2026-10-12')).toBeNull()
    expect(localStorage.getItem('mealPlanNotes_2026-10-19')).toBeNull()
    expect(localStorage.getItem('mealPlanNotes_2026-10-05')).not.toBeNull()
  })

  it('migrates a key saved with the old UTC date (day before the local week start)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 14))
    localStorage.setItem('mealPlanNotes_2026-10-11', JSON.stringify({ Monday: 'bst note' }))
    renderHook(() => useDayNotes(monday, days))
    await waitFor(() => expect(saveDayNote).toHaveBeenCalledWith('2026-10-12', 'bst note'))
    expect(localStorage.getItem('mealPlanNotes_2026-10-11')).toBeNull()
  })

  it('migration does not overwrite a note already in the DB', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 14))
    getDayNotesForWeek.mockResolvedValue({ '2026-10-13': 'from phone' })
    localStorage.setItem('mealPlanNotes_2026-10-12', JSON.stringify({ Tuesday: 'stale', Wednesday: 'keep' }))
    renderHook(() => useDayNotes(monday, days))
    await waitFor(() => expect(saveDayNote).toHaveBeenCalledWith('2026-10-14', 'keep'))
    expect(saveDayNote).toHaveBeenCalledTimes(1)
  })

  it('saves a pending note immediately on unmount', async () => {
    const { result, unmount } = renderHook(() => useDayNotes(monday, days))
    await waitFor(() => expect(getDayNotesForWeek).toHaveBeenCalled())
    act(() => { result.current.handleNoteChange('Friday', 'late') })
    unmount()
    expect(saveDayNote).toHaveBeenCalledWith('2026-10-16', 'late')
  })

  it('shows an error toast when a save fails', async () => {
    saveDayNote.mockRejectedValue(new Error('offline'))
    const { result, unmount } = renderHook(() => useDayNotes(monday, days))
    await waitFor(() => expect(getDayNotesForWeek).toHaveBeenCalled())
    act(() => { result.current.handleNoteChange('Friday', 'x') })
    unmount()
    await waitFor(() => expect(toastError).toHaveBeenCalled())
  })
})
