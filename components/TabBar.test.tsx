import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import TabBar from './TabBar'
import Header from './Header'

const mockPathname = vi.fn<() => string>()
vi.mock('next/navigation', () => ({ usePathname: () => mockPathname() }))

describe('navigation', () => {
  beforeEach(() => mockPathname.mockReset())

  it('puts Tonight, Recipes, Week and Shopping in the phone tab bar', () => {
    mockPathname.mockReturnValue('/')
    render(<TabBar />)

    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual(['Tonight', 'Recipes', 'Week', 'Shopping'])
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/', '/recipes', '/meal-plan', '/shopping-list'])
  })

  it('marks the current tab, including pages inside it', () => {
    mockPathname.mockReturnValue('/recipes/abc/cook')
    render(<TabBar />)

    expect(screen.getByRole('link', { name: 'Recipes' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Tonight' })).not.toHaveAttribute('aria-current')
  })

  it('only marks Tonight on the home page', () => {
    mockPathname.mockReturnValue('/meal-plan')
    render(<TabBar />)

    expect(screen.getByRole('link', { name: 'Tonight' })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('link', { name: 'Week' })).toHaveAttribute('aria-current', 'page')
  })

  it('has an equivalent desktop bar with Settings, and Agent Runs and Admin live under Settings', () => {
    mockPathname.mockReturnValue('/agent-runs')
    render(<Header />)

    const labels = screen.getAllByRole('link').map((link) => link.textContent)
    expect(labels).toEqual(['Family Meal Planner', 'Tonight', 'Recipes', 'Week', 'Shopping', 'Settings'])
    expect(screen.queryByRole('link', { name: 'Agent Runs' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('aria-current', 'page')
  })
})
