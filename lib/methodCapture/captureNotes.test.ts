import { describe, it, expect, beforeEach } from 'vitest'
import {
  addCaptureNote,
  clearCaptureDraft,
  formatElapsed,
  formatNotesForPrompt,
  loadCaptureDraft,
  parseCaptureNotes,
  removeCaptureNote,
  saveCaptureDraft,
  MAX_NOTES,
} from './captureNotes'

describe('formatElapsed', () => {
  it('should show minutes and seconds since the first note', () => {
    expect(formatElapsed(0)).toBe('+0:00')
    expect(formatElapsed(623_000)).toBe('+10:23')
    expect(formatElapsed(3_725_000)).toBe('+1:02:05')
    expect(formatElapsed(-5)).toBe('+0:00')
  })
})

describe('addCaptureNote / removeCaptureNote', () => {
  it('should add a trimmed note with its timestamp and ignore blanks', () => {
    const notes = addCaptureNote([], '  onions in  ', 1000)
    expect(notes).toEqual([{ id: 'n1000-0', at: 1000, text: 'onions in' }])
    expect(addCaptureNote(notes, '   ', 2000)).toBe(notes)
  })
  it('should stop adding at the cap', () => {
    let notes = [] as ReturnType<typeof addCaptureNote>
    for (let i = 0; i < MAX_NOTES + 5; i++) notes = addCaptureNote(notes, `note ${i}`, i)
    expect(notes).toHaveLength(MAX_NOTES)
  })
  it('should remove a note by id without mutating', () => {
    const notes = addCaptureNote(addCaptureNote([], 'a', 1), 'b', 2)
    expect(removeCaptureNote(notes, notes[0].id).map((n) => n.text)).toEqual(['b'])
    expect(notes).toHaveLength(2)
  })
})

describe('formatNotesForPrompt', () => {
  it('should number notes with the time since the first', () => {
    const notes = [
      { id: 'a', at: 1_000_000, text: 'onions in' },
      { id: 'b', at: 1_000_000 + 600_000, text: 'simmering' },
    ]
    expect(formatNotesForPrompt(notes)).toBe('1. [+0:00] onions in\n2. [+10:00] simmering')
    expect(formatNotesForPrompt([])).toBe('')
  })
})

describe('parseCaptureNotes', () => {
  it('should accept good notes sorted by time', () => {
    expect(parseCaptureNotes([{ at: 5, text: 'b' }, { at: 1, text: ' a ' }])).toEqual([
      { at: 1, text: 'a' },
      { at: 5, text: 'b' },
    ])
  })
  it('should reject empty, malformed and oversized input', () => {
    expect(parseCaptureNotes([])).toBeNull()
    expect(parseCaptureNotes('x')).toBeNull()
    expect(parseCaptureNotes([{ at: 'x', text: 'a' }])).toBeNull()
    expect(parseCaptureNotes([{ at: 1, text: '' }])).toBeNull()
    expect(parseCaptureNotes([{ at: 1, text: 'a'.repeat(501) }])).toBeNull()
  })
})

describe('local storage draft', () => {
  beforeEach(() => window.localStorage.clear())
  it('should round trip notes and a review draft, then clear', () => {
    const notes = addCaptureNote([], 'onions in', 1)
    saveCaptureDraft('r1', { notes, steps: [{ text: 'Fry onions.', timerSeconds: null }] })
    expect(loadCaptureDraft('r1')).toEqual({ notes, steps: [{ text: 'Fry onions.', timerSeconds: null }] })
    expect(loadCaptureDraft('r2')).toBeNull()
    clearCaptureDraft('r1')
    expect(loadCaptureDraft('r1')).toBeNull()
  })
  it('should treat corrupt storage as nothing saved', () => {
    window.localStorage.setItem('mealplanner.capture.r1', '{not json')
    expect(loadCaptureDraft('r1')).toBeNull()
  })
})
