import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RecipeModal from './RecipeModal'

const props = {
  onSubmit: vi.fn(),
  onCancel: vi.fn(),
  proteinOptions: [],
  carbOptions: [],
}

/**
 * Regression: the edit window used `flex items-center` on the same element that scrolls, so a
 * form taller than the screen was pushed above the top edge and could not be scrolled to.
 * jsdom has no layout, so these tests pin the CSS contract that makes it scroll; the real
 * check is done in a browser (see docs/rehaul/logs/RUN-phase1-fixes.md).
 */
describe('RecipeModal scrolling', () => {
  it('makes the overlay the scroll container without centring its content', () => {
    render(<RecipeModal {...props} />)
    const scroller = screen.getByTestId('recipe-modal-scroll')
    const cls = scroller.className.split(/\s+/)
    expect(cls).toContain('overflow-y-auto')
    expect(cls).toContain('fixed')
    expect(cls).toContain('inset-0')
    // Centring on the scrolling element itself is what cut the top off.
    expect(cls).not.toContain('flex')
    expect(cls).not.toContain('items-center')
    expect(cls).not.toContain('justify-center')
  })

  it('wraps the card in a wrapper that can grow past the screen height', () => {
    render(<RecipeModal {...props} />)
    const wrapper = screen.getByTestId('recipe-modal-scroll').firstElementChild as HTMLElement
    const cls = wrapper.className.split(/\s+/)
    expect(cls).toContain('min-h-full')
    expect(cls).not.toContain('h-full')
    expect(cls).not.toContain('h-screen')
    expect(cls.some((c) => c.startsWith('max-h-'))).toBe(false)
  })

  it('keeps the title in the document flow and the save button in a sticky bar', () => {
    render(<RecipeModal {...props} />)
    expect(screen.getByRole('heading', { name: 'Add New Recipe' })).toBeInTheDocument()
    const bar = screen.getByTestId('editor-actions')
    expect(bar.className).toContain('sticky')
    expect(bar.className).toContain('bottom-0')
    expect(bar).toContainElement(screen.getByRole('button', { name: 'Create Recipe' }))
  })
})
