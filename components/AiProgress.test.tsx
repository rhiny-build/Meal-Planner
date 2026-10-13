import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import AiProgress, { progressPercent } from './AiProgress'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('AiProgress', () => {
  it('renders nothing while inactive', () => {
    render(<AiProgress active={false} label="Reading the recipe" estimate={[5, 20]} />)
    expect(screen.queryByTestId('ai-progress')).not.toBeInTheDocument()
  })

  it('shows the label, the estimate, elapsed time and a progress bar while active', () => {
    render(<AiProgress active label="Reading the recipe" estimate={[5, 20]} />)
    expect(screen.getByRole('status')).toHaveTextContent('Reading the recipe')
    expect(screen.getByTestId('ai-progress-note')).toHaveTextContent('Usually takes 5-20 seconds.')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByTestId('ai-progress-elapsed')).toHaveTextContent('0s')
  })

  it('counts up and advances the bar, then admits when it is taking longer than usual', () => {
    render(<AiProgress active label="Searching" estimate={[5, 10]} />)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.getByTestId('ai-progress-elapsed')).toHaveTextContent('5s')
    const mid = Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'))
    expect(mid).toBeGreaterThan(30)
    expect(mid).toBeLessThan(90)
    expect(screen.getByTestId('ai-progress-note')).toHaveTextContent('Usually takes 5-10 seconds.')

    act(() => {
      vi.advanceTimersByTime(8000)
    })
    expect(screen.getByTestId('ai-progress-note')).toHaveTextContent('Taking longer than usual')
    expect(Number(screen.getByRole('progressbar').getAttribute('aria-valuenow'))).toBeLessThanOrEqual(90)
  })

  it('resets and disappears when the action finishes', () => {
    const { rerender } = render(<AiProgress active label="Searching" estimate={[5, 10]} />)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    rerender(<AiProgress active={false} label="Searching" estimate={[5, 10]} />)
    expect(screen.queryByTestId('ai-progress')).not.toBeInTheDocument()
    rerender(<AiProgress active label="Searching" estimate={[5, 10]} />)
    expect(screen.getByTestId('ai-progress-elapsed')).toHaveTextContent('0s')
  })
})

describe('progressPercent', () => {
  it('starts at 0, only goes up, and never passes 90', () => {
    expect(progressPercent(0, 20)).toBe(0)
    let prev = 0
    for (let t = 1; t <= 200; t++) {
      const p = progressPercent(t, 20)
      expect(p).toBeGreaterThanOrEqual(prev)
      expect(p).toBeLessThanOrEqual(90)
      prev = p
    }
  })
})
