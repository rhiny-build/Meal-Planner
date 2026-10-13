import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeekList from './WeekList'
import type { RecipeWithIngredients, WeekPlan } from '@/types'

const recipe = (id: string, name: string) => ({ id, name, kind: 'full', totalTimeMinutes: null }) as unknown as RecipeWithIngredients

const proteins = [recipe('bass', 'Sea Bass'), recipe('keema', 'Beef Keema')]
const carbs = [recipe('rice', 'Steamed Rice')]

const day = (name: string, date: Date, overrides: Partial<WeekPlan> = {}): WeekPlan => ({
  day: name,
  date,
  lunchRecipeId: '',
  proteinRecipeId: '',
  carbRecipeId: '',
  vegetableRecipeId: '',
  ...overrides,
})

const weekPlan = [
  day('Monday', new Date(2026, 9, 12), { proteinRecipeId: 'bass', carbRecipeId: 'rice' }),
  day('Tuesday', new Date(2026, 9, 13), { proteinRecipeId: 'keema' }),
  day('Wednesday', new Date(2026, 9, 14)),
]

function renderList(overrides: Partial<React.ComponentProps<typeof WeekList>> = {}) {
  const props = {
    weekPlan,
    dayNotes: { Tuesday: 'Football till 7' },
    lunchRecipes: [],
    proteinRecipes: proteins,
    carbRecipes: carbs,
    vegetableRecipes: [],
    onRecipeChange: vi.fn(),
    onNoteChange: vi.fn(),
    ...overrides,
  }
  render(<WeekList {...props} />)
  return props
}

describe('WeekList', () => {
  beforeEach(() => window.history.replaceState({}, '', '/meal-plan'))

  it('shows one row per day with the dinner, its sides and the note', () => {
    renderList()

    const rows = screen.getAllByTestId('week-day-row')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Mon')
    expect(rows[0]).toHaveTextContent('12')
    expect(rows[0]).toHaveTextContent('Sea Bass')
    expect(rows[0]).toHaveTextContent('Steamed Rice')
    expect(rows[1]).toHaveTextContent('Note: Football till 7')
    expect(rows[2]).toHaveTextContent('Nothing planned')
  })

  it('has a swap button for each day', () => {
    renderList()

    expect(screen.getByRole('button', { name: 'Change Monday' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change Tuesday' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change Wednesday' })).toBeInTheDocument()
  })

  it("opens that day's change sheet from the swap button and closes it with Done", async () => {
    const user = userEvent.setup()
    renderList()

    expect(screen.queryByTestId('day-swap-sheet')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Change Tuesday' }))

    const dialog = screen.getByRole('dialog', { name: 'Change Tuesday' })
    expect(within(dialog).getByText('Protein')).toBeInTheDocument()
    expect(within(dialog).getByText('Carb')).toBeInTheDocument()
    expect(within(dialog).getByText('Vegetable')).toBeInTheDocument()
    expect(within(dialog).getByText('Lunch')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Note')).toHaveValue('Football till 7')

    await user.click(within(dialog).getByRole('button', { name: 'Done' }))
    expect(screen.queryByTestId('day-swap-sheet')).toBeNull()
  })

  it('changes the day through the existing handlers', async () => {
    const user = userEvent.setup()
    const props = renderList()

    await user.click(screen.getByRole('button', { name: 'Change Wednesday' }))
    await user.type(screen.getByLabelText('Note'), 'x')

    expect(props.onNoteChange).toHaveBeenCalledWith('Wednesday', 'x')
  })

  it('closes the sheet with Escape', async () => {
    const user = userEvent.setup()
    renderList()

    await user.click(screen.getByRole('button', { name: 'Change Monday' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByTestId('day-swap-sheet')).toBeNull()
  })

  it('opens the sheet for the day named in ?day= (where Tonight sends you)', () => {
    window.history.replaceState({}, '', '/meal-plan?day=Tuesday')

    renderList()

    expect(screen.getByRole('dialog', { name: 'Change Tuesday' })).toBeInTheDocument()
  })

  it('ignores an unknown ?day=', () => {
    window.history.replaceState({}, '', '/meal-plan?day=Someday')

    renderList()

    expect(screen.queryByTestId('day-swap-sheet')).toBeNull()
  })
})
