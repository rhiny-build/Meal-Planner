import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTonight } from './useTonight'

const mockGetDayNotesForWeek = vi.fn()
vi.mock('@/app/meal-plan/dayNoteActions', () => ({
  getDayNotesForWeek: (weekStart: string) => mockGetDayNotesForWeek(weekStart),
}))

const recipe = (id: string, name: string) => ({ id, name, kind: 'full', totalTimeMinutes: null })

const weekRows = [
  { dayOfWeek: 'Monday', proteinRecipe: recipe('bass', 'Sea Bass') },
  { dayOfWeek: 'Tuesday', proteinRecipe: recipe('schnitzel', 'Schnitzel'), carbRecipe: recipe('fries', 'Fries') },
  { dayOfWeek: 'Wednesday', proteinRecipe: recipe('keema', 'Keema') },
  { dayOfWeek: 'Thursday' },
]

describe('useTonight', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 13, 18, 30)) // Tuesday evening
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ mealPlans: weekRows }) })
    mockGetDayNotesForWeek.mockResolvedValue({ '2026-10-13': 'Football till 7' })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it("picks today's meal, today's note and the days after it", async () => {
    const { result } = renderHook(() => useTonight(1))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.dinner?.main.name).toBe('Schnitzel')
    expect(result.current.dinner?.sides.map((side) => side.name)).toEqual(['Fries'])
    expect(result.current.dayNote).toBe('Football till 7')
    expect(result.current.restOfWeek.map((day) => day.dayOfWeek)).toEqual(['Wednesday', 'Thursday'])
  })

  it('asks for the week that contains today, using the configured week start', async () => {
    renderHook(() => useTonight(1))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())

    expect(fetchMock).toHaveBeenCalledWith('/api/meal-plan?startDate=2026-10-12')
    expect(mockGetDayNotesForWeek).toHaveBeenCalledWith('2026-10-12')
  })

  it('has no dinner (the empty state) when nothing is planned for today', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ mealPlans: [{ dayOfWeek: 'Tuesday' }, { dayOfWeek: 'Wednesday', proteinRecipe: recipe('k', 'Keema') }] }),
    })

    const { result } = renderHook(() => useTonight(1))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.dinner).toBeNull()
    expect(result.current.restOfWeek).toHaveLength(1)
  })

  it('has no dinner when the plan has no row for today', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ mealPlans: [] }) })

    const { result } = renderHook(() => useTonight(1))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.dinner).toBeNull()
    expect(result.current.hasError).toBe(false)
  })

  it('reports an error when the plan cannot be loaded', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useTonight(1))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.hasError).toBe(true)
    expect(result.current.dinner).toBeNull()
  })
})
