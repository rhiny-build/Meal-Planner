import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const refresh = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

import CookCaptureSlot from './CookCaptureSlot'
import type { CookRecipeData } from './cookTypes'

const recipe: CookRecipeData = {
  id: 'r1',
  name: 'Beef Keema',
  kind: 'full',
  servings: 4,
  ingredients: [{ id: 'beef', name: 'beef mince', quantity: '500', unit: 'g', amount: 500 }],
  steps: [],
}

const addNote = (text: string) => {
  fireEvent.change(screen.getByLabelText('New note'), { target: { value: text } })
  fireEvent.click(screen.getByRole('button', { name: 'Add note' }))
}

const respond = (ok: boolean, body: unknown) =>
  vi.fn().mockResolvedValue({ ok, json: async () => body })

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

describe('CookCaptureSlot', () => {
  it('should only offer a quiet button until it is tapped', () => {
    render(<CookCaptureSlot recipe={recipe} servings={4} />)
    expect(screen.getByRole('button', { name: 'Tell me as you go' })).toBeInTheDocument()
    expect(screen.queryByTestId('capture-panel')).not.toBeInTheDocument()
  })

  it('should keep notes across a reload until discarded', () => {
    const first = render(<CookCaptureSlot recipe={recipe} servings={4} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tell me as you go' }))
    addNote('onions in')
    addNote('mince browned')
    first.unmount()

    render(<CookCaptureSlot recipe={recipe} servings={4} />)
    expect(screen.getByTestId('capture-notes').children).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Discard notes' }))
    expect(window.localStorage.getItem('mealplanner.capture.r1')).toBeNull()
    expect(screen.getByRole('button', { name: 'Tell me as you go' })).toBeInTheDocument()
  })

  it('should finish, let the steps be edited, and save them', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ steps: [{ text: 'Brown {ing:beef}.', timerSeconds: 360 }, { text: 'Serve.', timerSeconds: null }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ saved: true }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<CookCaptureSlot recipe={recipe} servings={4} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tell me as you go' }))
    addNote('browned the mince')
    fireEvent.click(screen.getByRole('button', { name: /Finish/ }))

    await screen.findByTestId('capture-review')
    expect(screen.getByLabelText('Step 1 text')).toHaveValue('Brown {beef mince}.')
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1])
    fireEvent.change(screen.getByLabelText('Step 1 text'), { target: { value: 'Brown {beef mince} well.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save method' }))

    await waitFor(() => expect(refresh).toHaveBeenCalled())
    const saveBody = JSON.parse(fetchMock.mock.calls[1][1].body)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/recipes/r1/method')
    expect(saveBody.steps).toEqual([{ text: 'Brown {ing:beef} well.', timerSeconds: 360 }])
    expect(window.localStorage.getItem('mealplanner.capture.r1')).toBeNull()
  })

  it('should keep the notes and say so when Claude fails', async () => {
    vi.stubGlobal('fetch', respond(false, { error: 'That did not finish. Your notes are kept; try again.' }))
    render(<CookCaptureSlot recipe={recipe} servings={4} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tell me as you go' }))
    addNote('browned the mince')
    fireEvent.click(screen.getByRole('button', { name: /Finish/ }))
    expect(await screen.findByTestId('capture-error')).toHaveTextContent('Your notes are kept')
    expect(screen.getByTestId('capture-notes').children).toHaveLength(1)
  })

  it('should leave the recipe alone when the review is discarded', async () => {
    const fetchMock = respond(true, { steps: [{ text: 'Serve.', timerSeconds: null }] })
    vi.stubGlobal('fetch', fetchMock)
    render(<CookCaptureSlot recipe={recipe} servings={4} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tell me as you go' }))
    addNote('served')
    fireEvent.click(screen.getByRole('button', { name: /Finish/ }))
    await screen.findByTestId('capture-review')
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    expect(fetchMock).toHaveBeenCalledTimes(1) // only the structuring call, never a save
    expect(screen.getByRole('button', { name: 'Tell me as you go' })).toBeInTheDocument()
    expect(window.localStorage.getItem('mealplanner.capture.r1')).toBeNull()
  })
})
