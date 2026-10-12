import { describe, it, expect } from 'vitest'
import { stepToEditorText, editorTextToStep, replaceTokenWithName } from './stepEditorText'

const ings = [
  { id: 'a1', name: 'flour' },
  { id: 'b2', name: 'Olive oil' },
]

describe('stepEditorText', () => {
  it('shows ingredient names instead of ids', () => {
    expect(stepToEditorText('Sift {ing:a1} and add {ing:b2}.', ings)).toBe(
      'Sift {flour} and add {Olive oil}.'
    )
  })

  it('shows {ingredient} for unknown ids', () => {
    expect(stepToEditorText('Add {ing:zzz}', ings)).toBe('Add {ingredient}')
  })

  it('turns {name} back into a token, ignoring case', () => {
    expect(editorTextToStep('Sift {Flour} with {olive oil}', ings)).toBe(
      'Sift {ing:a1} with {ing:b2}'
    )
  })

  it('leaves unknown braces and partial typing as plain text', () => {
    expect(editorTextToStep('Add {salt} and {flo', ings)).toBe('Add {salt} and {flo')
  })

  it('round-trips', () => {
    const stored = 'Mix {ing:a1} then {ing:b2}'
    expect(editorTextToStep(stepToEditorText(stored, ings), ings)).toBe(stored)
  })

  it('replaces a removed ingredient token with its name', () => {
    expect(replaceTokenWithName('Add {ing:a1} and {ing:b2}', 'a1', 'flour')).toBe(
      'Add flour and {ing:b2}'
    )
  })
})
