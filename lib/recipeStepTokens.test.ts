import { describe, it, expect } from 'vitest'
import {
  makeIngredientToken, parseStepText, getStepIngredientIds, renderStepText,
  validateStepText, describeIngredient, formatAmount, UNKNOWN_INGREDIENT_TEXT,
} from './recipeStepTokens'

const flour = { id: 'clx1abc', name: 'flour', quantity: '200', unit: 'g', amount: 200 }
const salt = { id: 'clx2def', name: 'salt', quantity: 'a pinch', unit: null, amount: null }

describe('tokens', () => {
  it('makes tokens', () => {
    expect(makeIngredientToken('abc')).toBe('{ing:abc}')
  })

  it('parses text and ingredient segments', () => {
    expect(parseStepText('Mix {ing:a1} and {ing:b-2}.')).toEqual([
      { type: 'text', text: 'Mix ' },
      { type: 'ingredient', id: 'a1' },
      { type: 'text', text: ' and ' },
      { type: 'ingredient', id: 'b-2' },
      { type: 'text', text: '.' },
    ])
    expect(parseStepText('')).toEqual([])
  })

  it('lists unique ids in order', () => {
    expect(getStepIngredientIds('{ing:a} {ing:b} {ing:a}')).toEqual(['a', 'b'])
  })
})

describe('renderStepText', () => {
  it('renders scaled amounts', () => {
    expect(renderStepText('Sift {ing:clx1abc}.', [flour], 1.5)).toBe('Sift 300 g flour.')
    expect(renderStepText('Sift {ing:clx1abc}.', [flour], 0.5)).toBe('Sift 100 g flour.')
  })

  it('falls back to free text when there is no amount', () => {
    expect(renderStepText('Add {ing:clx2def}.', [salt], 2)).toBe('Add a pinch salt.')
  })

  it('renders unknown ids as plain text and does not throw', () => {
    expect(renderStepText('Add {ing:gone}.', [flour])).toBe(`Add ${UNKNOWN_INGREDIENT_TEXT}.`)
  })

  it('leaves malformed tokens and plain text alone', () => {
    expect(renderStepText('Stir {ing: now {ing:}', [flour])).toBe('Stir {ing: now {ing:}')
    expect(renderStepText('No tokens', [])).toBe('No tokens')
  })

  it('handles empty text and bad scale', () => {
    expect(renderStepText('', [flour])).toBe('')
    expect(renderStepText('{ing:clx1abc}', [flour], NaN)).toBe('200 g flour')
    expect(renderStepText('{ing:clx1abc}', [flour], -2)).toBe('200 g flour')
  })

  it('formats awkward amounts', () => {
    expect(formatAmount(1 / 3)).toBe('0.33')
    expect(formatAmount(2)).toBe('2')
    expect(describeIngredient({ id: 'x', name: 'egg', amount: 2 }, 1.5)).toBe('3 egg')
  })
})

describe('validateStepText', () => {
  it('accepts known ids', () => {
    expect(validateStepText('Add {ing:a}', ['a'])).toEqual({ valid: true, unknownIds: [], malformed: [] })
  })
  it('flags unknown ids', () => {
    expect(validateStepText('Add {ing:zz}', ['a'])).toEqual({ valid: false, unknownIds: ['zz'], malformed: [] })
  })
  it('flags malformed tokens', () => {
    const r = validateStepText('Add {ing:} and {ing:abc', ['abc'])
    expect(r.valid).toBe(false)
    expect(r.malformed).toHaveLength(2)
  })
  it('plain text is valid', () => {
    expect(validateStepText('Just stir.', []).valid).toBe(true)
  })
})
