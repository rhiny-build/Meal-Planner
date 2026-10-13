import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import TonightClient from './TonightClient'
import type { TonightState } from '@/lib/hooks/useTonight'
import type { TonightRecipe } from '@/lib/tonight'

const mockTonight = vi.fn<() => TonightState>()
vi.mock('@/lib/hooks/useTonight', () => ({ useTonight: () => mockTonight() }))
vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

const recipe = (id: string, name: string, totalTimeMinutes: number | null = null): TonightRecipe => ({
  id,
  name,
  kind: 'full',
  totalTimeMinutes,
})

const baseState: TonightState = {
  isLoading: false,
  hasError: false,
  today: new Date(2026, 9, 13), // Tuesday
  dinner: null,
  dayNote: '',
  restOfWeek: [],
}

describe('TonightClient', () => {
  beforeEach(() => mockTonight.mockReset())

  it("shows today's dinner with its sides and time", () => {
    mockTonight.mockReturnValue({
      ...baseState,
      dinner: {
        main: recipe('schnitzel', 'Oven Baked Chicken Schnitzel', 40),
        sides: [recipe('fries', 'Simple Fries'), recipe('rocket', 'Rocket Salad')],
      },
    })

    render(<TonightClient weekStartDay={1} />)

    expect(screen.getByTestId('tonight-main')).toHaveTextContent('Oven Baked Chicken Schnitzel')
    expect(screen.getByTestId('tonight-sides')).toHaveTextContent('+ Simple Fries')
    expect(screen.getByTestId('tonight-sides')).toHaveTextContent('+ Rocket Salad')
    expect(screen.getByTestId('tonight-sides')).toHaveTextContent('40 min')
    expect(screen.getByText('Tuesday 13 October')).toBeInTheDocument()
  })

  it('opens cook mode for the main recipe and the swap sheet for today', () => {
    mockTonight.mockReturnValue({
      ...baseState,
      dinner: { main: recipe('schnitzel', 'Schnitzel'), sides: [recipe('fries', 'Fries')] },
    })

    render(<TonightClient weekStartDay={1} />)

    expect(screen.getByRole('link', { name: 'Start cooking' })).toHaveAttribute('href', '/recipes/schnitzel/cook')
    expect(screen.getByRole('link', { name: "Swap tonight's meal" })).toHaveAttribute('href', '/meal-plan?day=Tuesday')
  })

  it("shows today's note when there is one, and nothing when there is not", () => {
    mockTonight.mockReturnValue({
      ...baseState,
      dayNote: 'Football till 7',
      dinner: { main: recipe('a', 'A'), sides: [] },
    })
    const { rerender } = render(<TonightClient weekStartDay={1} />)
    expect(screen.getByTestId('tonight-note')).toHaveTextContent('Note: Football till 7')

    mockTonight.mockReturnValue({ ...baseState, dinner: { main: recipe('a', 'A'), sides: [] } })
    rerender(<TonightClient weekStartDay={1} />)
    expect(screen.queryByTestId('tonight-note')).toBeNull()
  })

  it('lists the rest of the week compactly', () => {
    mockTonight.mockReturnValue({
      ...baseState,
      dinner: { main: recipe('a', 'A'), sides: [] },
      restOfWeek: [
        { dayOfWeek: 'Wednesday', proteinRecipe: recipe('k', 'Beef Keema'), carbRecipe: recipe('r', 'Steamed Rice') },
        { dayOfWeek: 'Thursday' },
      ],
    })

    render(<TonightClient weekStartDay={1} />)

    const rows = screen.getByTestId('rest-of-week').querySelectorAll('li')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Wed')
    expect(rows[0]).toHaveTextContent('Beef Keema')
    expect(rows[0]).toHaveTextContent('Steamed Rice')
    expect(rows[1]).toHaveTextContent('Nothing planned')
  })

  it('shows a clear empty state with one action to plan tonight', () => {
    mockTonight.mockReturnValue({ ...baseState, dinner: null })

    render(<TonightClient weekStartDay={1} />)

    expect(screen.getByTestId('tonight-empty')).toHaveTextContent('Nothing planned for tonight')
    expect(screen.getByRole('link', { name: 'Plan tonight' })).toHaveAttribute('href', '/meal-plan?day=Tuesday')
    expect(screen.queryByRole('link', { name: 'Start cooking' })).toBeNull()
  })

  it('shows a loading placeholder, then no dinner card, while loading', () => {
    mockTonight.mockReturnValue({ ...baseState, isLoading: true, today: null })

    render(<TonightClient weekStartDay={1} />)

    expect(screen.getByLabelText('Loading tonight')).toBeInTheDocument()
    expect(screen.queryByTestId('tonight-empty')).toBeNull()
  })

  it('says so when the plan could not be loaded', () => {
    mockTonight.mockReturnValue({ ...baseState, hasError: true })

    render(<TonightClient weekStartDay={1} />)

    expect(screen.getByRole('alert')).toHaveTextContent("Could not load tonight's plan")
  })

  it('links to the shopping list and the meal plan', () => {
    mockTonight.mockReturnValue(baseState)

    render(<TonightClient weekStartDay={1} />)

    expect(screen.getByRole('link', { name: /Shopping list/ })).toHaveAttribute('href', '/shopping-list')
    expect(screen.getByRole('link', { name: /Meal plan/ })).toHaveAttribute('href', '/meal-plan')
  })
})
