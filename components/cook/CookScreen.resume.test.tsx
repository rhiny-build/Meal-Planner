import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import CookScreen from './CookScreen'
import type { CookRecipeData } from './cookTypes'
import { COOK_SESSION_KEY, COOK_SESSION_MAX_AGE_MS, loadCookSession, saveCookSession } from '@/lib/cook/cookSession'

vi.mock('@/lib/cook/timerAlert', () => ({ alertTimerFinished: vi.fn(), unlockTimerAudio: vi.fn() }))

const recipe: CookRecipeData = {
  id: 'r1',
  name: 'Beef Keema',
  kind: 'full',
  servings: 4,
  ingredients: [],
  steps: [
    { id: 's1', order: 0, text: 'Brown the beef.', timerSeconds: 600 },
    { id: 's2', order: 1, text: 'Season.', timerSeconds: null },
    { id: 's3', order: 2, text: 'Serve.', timerSeconds: null },
  ],
}

describe('CookScreen resume', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(1_800_000_000_000)
  })
  afterEach(() => vi.useRealTimers())

  it('saves the place as it changes: step, servings and a running timer by its end time', () => {
    render(<CookScreen recipe={recipe} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }))
    fireEvent.click(screen.getByRole('button', { name: 'More servings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    const saved = loadCookSession()!
    expect(saved.recipeId).toBe('r1')
    expect(saved.recipeName).toBe('Beef Keema')
    expect(saved.stepIndex).toBe(1)
    expect(saved.servings).toBe(5)
    expect(saved.timers.s1).toMatchObject({ status: 'running', endsAt: 1_800_000_000_000 + 600_000 })
  })

  it('resumes after a reload: same step, servings and timer, still counting down', () => {
    const first = render(<CookScreen recipe={recipe} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    first.unmount() // the reload

    act(() => {
      vi.advanceTimersByTime(90_000) // time passes while the app is away
    })
    render(<CookScreen recipe={recipe} />)

    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 2 of 3')
    expect(screen.getByTestId('active-timer')).toHaveAttribute('data-status', 'running')
    expect(screen.getByTestId('active-timer')).toHaveTextContent('8:30')
  })

  it('does not resume another recipe, and a new recipe replaces the old session', () => {
    saveCookSession({ recipeId: 'other', recipeName: 'Other', servings: 2, stepIndex: 2, timers: {}, updatedAt: Date.now() })
    render(<CookScreen recipe={recipe} />)

    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 1 of 3')
    expect(loadCookSession()!.recipeId).toBe('r1')
  })

  it('does not resume a session more than 12 hours old', () => {
    saveCookSession({
      recipeId: 'r1',
      recipeName: 'Beef Keema',
      servings: 4,
      stepIndex: 2,
      timers: {},
      updatedAt: Date.now() - COOK_SESSION_MAX_AGE_MS - 1,
    })
    render(<CookScreen recipe={recipe} />)

    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 1 of 3')
  })

  it('lets a timer that ended while away finish and alert on return', () => {
    saveCookSession({
      recipeId: 'r1',
      recipeName: 'Beef Keema',
      servings: 4,
      stepIndex: 0,
      timers: { s1: { status: 'running', totalMs: 600_000, remainingMs: 600_000, endsAt: Date.now() - 1000 } },
      updatedAt: Date.now() - 5000,
    })
    render(<CookScreen recipe={recipe} />)
    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(screen.getByTestId('active-timer')).toHaveAttribute('data-status', 'done')
  })

  it.each([['Close', 'link', 'Leave cook mode'], ['Finish', 'link', 'Finish']])(
    'clears the session when you leave on purpose with %s',
    (_label, role, name) => {
      render(<CookScreen recipe={recipe} />)
      fireEvent.click(screen.getByRole('button', { name: 'Next' }))
      fireEvent.click(screen.getByRole('button', { name: 'Next' }))
      expect(window.localStorage.getItem(COOK_SESSION_KEY)).not.toBeNull()

      fireEvent.click(screen.getByRole(role as 'link', { name }))

      expect(window.localStorage.getItem(COOK_SESSION_KEY)).toBeNull()
    }
  )

  it('the embedded Method tab saves only once you move on', () => {
    render(<CookScreen recipe={recipe} isEmbedded servings={4} onServingsChange={() => {}} />)
    expect(window.localStorage.getItem(COOK_SESSION_KEY)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(loadCookSession()!.stepIndex).toBe(1)
  })
})
