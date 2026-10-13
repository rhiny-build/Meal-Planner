import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import CookScreen from './CookScreen'
import type { CookRecipeData } from './cookTypes'

vi.mock('@/lib/cook/timerAlert', () => ({
  alertTimerFinished: vi.fn(),
  unlockTimerAudio: vi.fn(),
}))
import { alertTimerFinished } from '@/lib/cook/timerAlert'

const recipe: CookRecipeData = {
  id: 'r1',
  name: 'Beef Keema',
  kind: 'full',
  servings: 4,
  ingredients: [
    { id: 'beef', name: 'beef mince', quantity: '500', unit: 'g', amount: 500 },
    { id: 'salt', name: 'salt', quantity: 'to taste', unit: null, amount: null },
  ],
  steps: [
    { id: 's1', order: 0, text: 'Brown {ing:beef}.', timerSeconds: 600 },
    { id: 's2', order: 1, text: 'Season with {ing:salt}.', timerSeconds: 120 },
    { id: 's3', order: 2, text: 'Serve.', timerSeconds: null },
  ],
}

describe('CookScreen', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('should show one step at a time and move with Next and Back', () => {
    render(<CookScreen recipe={recipe} />)
    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 1 of 3')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 2 of 3')
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 1 of 3')
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
  })

  it('should replace Next with Finish on the last step', () => {
    render(<CookScreen recipe={recipe} />)
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Finish' })).toHaveAttribute('href', '/recipes/r1')
  })

  it('should rescale amounts in the step text when servings change', () => {
    render(<CookScreen recipe={recipe} />)
    expect(screen.getByTestId('step-text')).toHaveTextContent('Brown 500 g beef mince.')
    fireEvent.click(screen.getByRole('button', { name: 'More servings' }))
    fireEvent.click(screen.getByRole('button', { name: 'More servings' }))
    expect(screen.getByTestId('servings-value')).toHaveTextContent('6')
    expect(screen.getByTestId('step-text')).toHaveTextContent('Brown 750 g beef mince.')
  })

  it('should keep the servings when changing step and show free text unscaled', () => {
    render(<CookScreen recipe={recipe} />)
    fireEvent.click(screen.getByRole('button', { name: 'Fewer servings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fewer servings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByTestId('servings-value')).toHaveTextContent('2')
    expect(screen.getByTestId('step-text')).toHaveTextContent('Season with to taste salt.')
  })

  it('should open the ingredients sheet with scaled amounts', () => {
    render(<CookScreen recipe={recipe} />)
    fireEvent.click(screen.getByRole('button', { name: 'More servings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ingredients' }))
    const sheet = screen.getByTestId('ingredients-sheet')
    expect(within(sheet).getByText('625 g beef mince')).toBeInTheDocument()
    expect(within(sheet).getByText('not scaled')).toBeInTheDocument()
  })

  it('should keep timers running across steps, run two at once and alert when one finishes', () => {
    render(<CookScreen recipe={recipe} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }))
    expect(screen.getAllByTestId('active-timer')).toHaveLength(2)

    act(() => {
      vi.advanceTimersByTime(121_000)
    })
    const timers = screen.getAllByTestId('active-timer')
    expect(timers[0]).toHaveAttribute('data-status', 'running')
    expect(timers[1]).toHaveAttribute('data-status', 'done')
    expect(alertTimerFinished).toHaveBeenCalledTimes(1)

    // Moving to another step does not stop the first timer
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    act(() => {
      vi.advanceTimersByTime(480_000)
    })
    expect(screen.getAllByTestId('active-timer')[0]).toHaveAttribute('data-status', 'done')
    expect(alertTimerFinished).toHaveBeenCalledTimes(2)
  })

  it('should jump to a timer step from the timer strip', () => {
    render(<CookScreen recipe={recipe} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByTestId('active-timer'))
    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 1 of 3')
  })

  it('should pause and reset a timer', () => {
    render(<CookScreen recipe={recipe} />)
    fireEvent.click(screen.getByRole('button', { name: 'Start timer' }))
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByTestId('timer-clock')).toHaveTextContent('9:00')
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByTestId('timer-clock')).toHaveTextContent('10:00')
    expect(screen.queryByTestId('active-timer')).toBeNull()
  })

  it('should show ingredients, a quiet note and the capture slot when there is no method', () => {
    render(<CookScreen recipe={{ ...recipe, steps: [] }} />)
    expect(screen.getByTestId('cook-no-method')).toBeInTheDocument()
    expect(screen.getByTestId('no-method-note')).toBeInTheDocument()
    expect(screen.getByTestId('cook-capture-slot')).toBeInTheDocument()
    expect(screen.queryByTestId('step-counter')).toBeNull()
  })

  it('should show a one-screen view for quick recipes', () => {
    render(<CookScreen recipe={{ ...recipe, kind: 'quick' }} />)
    expect(screen.getByTestId('cook-quick')).toBeInTheDocument()
    expect(screen.getAllByTestId('quick-step')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()
  })

  it('should hide the servings control and not scale when the recipe has no servings', () => {
    render(<CookScreen recipe={{ ...recipe, servings: null }} />)
    expect(screen.queryByTestId('servings-control')).toBeNull()
    expect(screen.getByTestId('step-text')).toHaveTextContent('Brown 500 g beef mince.')
  })

  it('should move with the arrow keys', () => {
    render(<CookScreen recipe={recipe} />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 2 of 3')
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 1 of 3')
  })
})
