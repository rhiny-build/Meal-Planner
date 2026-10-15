import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RecipePages from './RecipePages'
import type { CookRecipeData } from '@/components/cook/cookTypes'
import type { RecipeOverviewData } from './recipeOverview'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/lib/cook/timerAlert', () => ({ alertTimerFinished: vi.fn(), unlockTimerAudio: vi.fn() }))

const recipe: CookRecipeData = {
  id: 'r1',
  name: 'Schnitzel',
  kind: 'full',
  servings: 4,
  ingredients: [
    { id: 'chicken', name: 'chicken breasts', quantity: '2', unit: null, amount: 2 },
    { id: 'salt', name: 'salt', quantity: 'to taste', unit: null, amount: null },
  ],
  steps: [
    { id: 's1', order: 0, text: 'Slice {ing:chicken}.', timerSeconds: null },
    { id: 's2', order: 1, text: 'Bake.', timerSeconds: 900 },
  ],
}

const overview: RecipeOverviewData = {
  description: 'Crumbed chicken baked rather than fried.',
  notes: null,
  recipeUrl: null,
  timeLabel: '40 min',
  servings: 4,
  stepCount: 2,
  chips: [{ label: 'Chicken', isHighlighted: false }],
}

// Hidden panels have no accessible name in jsdom, so look them up by id.
const isShown = (name: string) => !document.getElementById(`recipe-panel-${name}`)!.hasAttribute('hidden')

describe('RecipePages', () => {
  beforeEach(() => window.localStorage.clear())

  it('opens on Overview and flips with the tabs', () => {
    render(<RecipePages recipe={recipe} overview={overview} />)

    expect(isShown('Overview')).toBe(true)
    expect(screen.getByTestId('recipe-meta')).toHaveTextContent('40 min')
    expect(screen.getByText('Crumbed chicken baked rather than fried.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'Ingredients' }))
    expect(isShown('Ingredients')).toBe(true)
    expect(isShown('Overview')).toBe(false)

    fireEvent.click(screen.getByRole('tab', { name: 'Method' }))
    expect(isShown('Method')).toBe(true)
  })

  it('moves on with the button at the bottom', () => {
    render(<RecipePages recipe={recipe} overview={overview} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ingredients' }))
    expect(isShown('Ingredients')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Start cooking' }))
    expect(isShown('Method')).toBe(true)
    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 1 of 2')
  })

  it('flips pages with a swipe', () => {
    render(<RecipePages recipe={recipe} overview={overview} />)
    const overviewPanel = screen.getByRole('tabpanel', { name: 'Overview' })

    fireEvent.touchStart(overviewPanel, { touches: [{ clientX: 300, clientY: 400 }] })
    fireEvent.touchEnd(overviewPanel, { changedTouches: [{ clientX: 100, clientY: 410 }] })
    expect(isShown('Ingredients')).toBe(true)

    const ingredientsPanel = screen.getByRole('tabpanel', { name: 'Ingredients' })
    fireEvent.touchStart(ingredientsPanel, { touches: [{ clientX: 100, clientY: 400 }] })
    fireEvent.touchEnd(ingredientsPanel, { changedTouches: [{ clientX: 300, clientY: 400 }] })
    expect(isShown('Overview')).toBe(true)
  })

  it('does not flip on a mostly vertical or short drag', () => {
    render(<RecipePages recipe={recipe} overview={overview} />)
    const panel = screen.getByRole('tabpanel', { name: 'Overview' })

    fireEvent.touchStart(panel, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 120, clientY: 400 }] })
    fireEvent.touchStart(panel, { touches: [{ clientX: 200, clientY: 100 }] })
    fireEvent.touchEnd(panel, { changedTouches: [{ clientX: 180, clientY: 100 }] })

    expect(isShown('Overview')).toBe(true)
  })

  it('rescales ingredients and the steps from the servings control', () => {
    render(<RecipePages recipe={recipe} overview={overview} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Ingredients' }))

    expect(screen.getByTestId('cook-ingredient-list')).toHaveTextContent('2 chicken breasts')
    fireEvent.click(screen.getByRole('button', { name: 'More servings' }))
    fireEvent.click(screen.getByRole('button', { name: 'More servings' }))

    expect(screen.getByTestId('servings-value')).toHaveTextContent('6')
    expect(screen.getByTestId('cook-ingredient-list')).toHaveTextContent('3 chicken breasts')

    fireEvent.click(screen.getByRole('tab', { name: 'Method' }))
    expect(screen.getByTestId('step-text')).toHaveTextContent('Slice 3 chicken breasts.')
  })

  it('steps through the method one step at a time (cook mode embedded)', () => {
    render(<RecipePages recipe={recipe} overview={overview} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Method' }))

    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 1 of 2')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 2 of 2')
    expect(screen.getByRole('button', { name: 'Start timer' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Done, back to tonight' })).toHaveAttribute('href', '/')
  })

  it('keeps the step when you flip away from Method and back', () => {
    render(<RecipePages recipe={recipe} overview={overview} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Method' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    fireEvent.click(screen.getByRole('tab', { name: 'Ingredients' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Method' }))

    expect(screen.getByTestId('step-counter')).toHaveTextContent('Step 2 of 2')
  })

  it("shows cook mode's no-method view, including tell me as you go, for a recipe with no method", () => {
    render(<RecipePages recipe={{ ...recipe, steps: [] }} overview={{ ...overview, stepCount: 0 }} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Method' }))

    expect(screen.getByTestId('cook-no-method')).toBeInTheDocument()
    expect(screen.getByTestId('no-method-note')).toBeInTheDocument()
    expect(screen.getByTestId('cook-capture-slot')).toBeInTheDocument()
  })

  it('links to full-screen cook mode from the Method page', () => {
    render(<RecipePages recipe={recipe} overview={overview} />)

    expect(screen.getByTestId('cook-button')).toHaveAttribute('href', '/recipes/r1/cook')
  })
})
