import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeekList from './WeekList'
import type { RecipeWithIngredients, WeekPlan } from '@/types'

const recipe = (id: string, name: string, ingredients: string[] = []) =>
  ({
    id,
    name,
    kind: 'full',
    totalTimeMinutes: null,
    recipeUrl: null,
    structuredIngredients: ingredients.map((ingredient, index) => ({
      id: `${id}-${index}`,
      name: ingredient,
      quantity: null,
      unit: null,
      notes: null,
    })),
  }) as unknown as RecipeWithIngredients

const proteins = [recipe('bass', 'Sea Bass', ['sea bass fillets', 'lemon']), recipe('keema', 'Beef Keema')]
const carbs = [recipe('rice', 'Steamed Rice')]
const lunches = [recipe('soup', 'Tomato Soup')]

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
  day('Monday', new Date(2026, 9, 12), { proteinRecipeId: 'bass', carbRecipeId: 'rice', lunchRecipeId: 'soup' }),
  day('Tuesday', new Date(2026, 9, 13), { proteinRecipeId: 'keema' }),
  day('Wednesday', new Date(2026, 9, 14)),
]

function renderList(overrides: Partial<React.ComponentProps<typeof WeekList>> = {}) {
  const props = {
    weekPlan,
    dayNotes: { Tuesday: 'Football till 7' },
    lunchRecipes: lunches,
    proteinRecipes: proteins,
    carbRecipes: carbs,
    vegetableRecipes: [],
    onRecipeChange: vi.fn(),
    onNoteChange: vi.fn(),
    onSwapRecipes: vi.fn(),
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
    expect(within(rows[1]).getByLabelText('Note for Tuesday')).toHaveValue('Football till 7')
    expect(rows[2]).toHaveTextContent('Plan this day')
    expect(rows[2]).not.toHaveTextContent('Nothing planned')
  })

  it('shows lunch as a small second line and keeps it out of the dinner', () => {
    renderList()

    const [monday, tuesday] = screen.getAllByTestId('week-day-row')
    expect(within(monday).getByTestId('week-day-lunch')).toHaveTextContent('Lunch: Tomato Soup')
    expect(within(tuesday).queryByTestId('week-day-lunch')).toBeNull()
  })

  it("opens a day's ingredients when the day is tapped", async () => {
    const user = userEvent.setup()
    renderList()
    const monday = screen.getAllByTestId('week-day-row')[0]

    expect(within(monday).queryByTestId('week-day-details')).toBeNull()
    await user.click(within(monday).getByRole('button', { name: 'Show Monday details' }))

    const details = within(monday).getByTestId('week-day-details')
    expect(details).toHaveTextContent('Protein: Sea Bass')
    expect(details).toHaveTextContent('sea bass fillets')
    expect(details).toHaveTextContent('lemon')
    expect(details).toHaveTextContent('Carb: Steamed Rice')
    expect(details).toHaveTextContent('Vegetable: none selected')
    expect(details).toHaveTextContent('Lunch: Tomato Soup')
    expect(within(details).getByRole('link', { name: 'Sea Bass' })).toHaveAttribute('href', '/recipes/bass')

    await user.click(within(monday).getByRole('button', { name: 'Hide Monday details' }))
    expect(within(monday).queryByTestId('week-day-details')).toBeNull()
  })

  it('has an edit button for each day (not a swap icon)', () => {
    renderList()

    expect(screen.getByRole('button', { name: 'Edit Monday' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Tuesday' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Wednesday' })).toBeInTheDocument()
  })

  it("opens that day's editor from the edit button and closes it with Done", async () => {
    const user = userEvent.setup()
    renderList()

    expect(screen.queryByTestId('day-edit-sheet')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Edit Tuesday' }))

    const dialog = screen.getByRole('dialog', { name: 'Edit Tuesday' })
    expect(within(dialog).getByText('Protein', { selector: 'span' })).toBeInTheDocument()
    expect(within(dialog).getByText('Carb', { selector: 'span' })).toBeInTheDocument()
    expect(within(dialog).getByText('Vegetable', { selector: 'span' })).toBeInTheDocument()
    expect(within(dialog).getByText('Lunch', { selector: 'span' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Note')).toHaveValue('Football till 7')

    await user.click(within(dialog).getByRole('button', { name: 'Done' }))
    expect(screen.queryByTestId('day-edit-sheet')).toBeNull()
  })

  it('types a note in the row itself, no editor needed', async () => {
    const user = userEvent.setup()
    const props = renderList()

    await user.type(screen.getByLabelText('Note for Wednesday'), 'x')

    expect(screen.queryByTestId('day-edit-sheet')).toBeNull()
    expect(screen.getByLabelText('Note for Wednesday')).toHaveAttribute('placeholder', 'Add note')
    expect(props.onNoteChange).toHaveBeenCalledWith('Wednesday', 'x')
  })

  it('opens the editor when the day itself is tapped', async () => {
    const user = userEvent.setup()
    renderList()

    await user.click(screen.getByText('Plan this day'))

    expect(screen.getByRole('dialog', { name: 'Edit Wednesday' })).toBeInTheDocument()
  })

  it('changes the day through the existing handlers', async () => {
    const user = userEvent.setup()
    const props = renderList()

    await user.click(screen.getByRole('button', { name: 'Edit Wednesday' }))
    await user.type(screen.getByLabelText('Note'), 'x')

    expect(props.onNoteChange).toHaveBeenCalledWith('Wednesday', 'x')
  })

  it('swaps the whole dinner with another day (protein, carb and vegetable)', async () => {
    const user = userEvent.setup()
    const props = renderList()

    await user.click(screen.getByRole('button', { name: 'Edit Tuesday' }))
    expect(screen.getByRole('button', { name: 'Swap' })).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Swap with day'), 'Wednesday')
    await user.click(screen.getByRole('button', { name: 'Swap' }))

    expect(vi.mocked(props.onSwapRecipes).mock.calls).toEqual([
      ['protein', 1, 2],
      ['carb', 1, 2],
      ['vegetable', 1, 2],
    ])
  })

  it('swaps a single slot with another day and cannot pick the same day', async () => {
    const user = userEvent.setup()
    const props = renderList()

    await user.click(screen.getByRole('button', { name: 'Edit Tuesday' }))
    await user.selectOptions(screen.getByLabelText('What to swap'), 'carb')
    const dayChoices = within(screen.getByLabelText('Swap with day')).getAllByRole('option').map((option) => option.textContent)
    expect(dayChoices).toEqual(['Day...', 'Monday', 'Wednesday'])
    await user.selectOptions(screen.getByLabelText('Swap with day'), 'Monday')
    await user.click(screen.getByRole('button', { name: 'Swap' }))

    expect(vi.mocked(props.onSwapRecipes).mock.calls).toEqual([['carb', 1, 0]])
  })

  it('closes the sheet with Escape', async () => {
    const user = userEvent.setup()
    renderList()

    await user.click(screen.getByRole('button', { name: 'Edit Monday' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByTestId('day-edit-sheet')).toBeNull()
  })

  it('opens the sheet for the day named in ?day= (where Tonight sends you)', () => {
    window.history.replaceState({}, '', '/meal-plan?day=Tuesday')

    renderList()

    expect(screen.getByRole('dialog', { name: 'Edit Tuesday' })).toBeInTheDocument()
  })

  it('ignores an unknown ?day=', () => {
    window.history.replaceState({}, '', '/meal-plan?day=Someday')

    renderList()

    expect(screen.queryByTestId('day-edit-sheet')).toBeNull()
  })
})
