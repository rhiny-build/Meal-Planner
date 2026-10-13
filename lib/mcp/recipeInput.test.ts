import { describe, it, expect } from 'vitest'
import { toIngredientRow, toLegacyIngredientText, resolveSteps, remapStepTokens } from './recipeInput'

describe('toIngredientRow', () => {
  it('uses a given numeric amount and fills quantity text', () => {
    expect(toIngredientRow({ name: ' flour ', amount: 300, unit: 'g' }, 0)).toEqual({
      name: 'flour', quantity: '300', unit: 'g', amount: 300, notes: null, order: 0,
    })
  })
  it('parses the legacy quantity string when no amount is given', () => {
    const row = toIngredientRow({ name: 'beef', quantity: '1 1/2', unit: 'pounds' }, 2)
    expect(row.amount).toBe(1.5)
    expect(row.quantity).toBe('1 1/2')
    expect(row.order).toBe(2)
  })
  it('leaves amount null for unparseable text', () => {
    const row = toIngredientRow({ name: 'salt', quantity: 'a pinch' }, 0)
    expect(row.amount).toBeNull()
    expect(row.quantity).toBe('a pinch')
  })
  it('handles name only', () => {
    expect(toIngredientRow({ name: 'water' }, 0)).toMatchObject({ quantity: null, unit: null, amount: null })
  })
})

describe('toLegacyIngredientText', () => {
  it('joins quantity unit name per line', () => {
    const rows = [
      toIngredientRow({ name: 'flour', amount: 300, unit: 'g' }, 0),
      toIngredientRow({ name: 'egg' }, 1),
    ]
    expect(toLegacyIngredientText(rows)).toBe('300 g flour\negg')
  })
})

describe('resolveSteps', () => {
  const ids = ['cAAA', 'cBBB']
  it('converts 1-based positions to id tokens and keeps timers', () => {
    const r = resolveSteps([{ text: 'Mix {ing:1} and {ing:2}.', timerSeconds: 60 }, { text: 'Rest.' }], ids)
    expect(r).toEqual({
      ok: true,
      steps: [
        { order: 0, text: 'Mix {ing:cAAA} and {ing:cBBB}.', timerSeconds: 60 },
        { order: 1, text: 'Rest.', timerSeconds: null },
      ],
    })
  })
  it('accepts real ids of the recipe', () => {
    const r = resolveSteps([{ text: 'Add {ing:cBBB}' }], ids)
    expect(r.ok).toBe(true)
  })
  it('rejects out-of-range positions (0 and too large)', () => {
    expect(resolveSteps([{ text: '{ing:0}' }], ids)).toMatchObject({ ok: false })
    const r = resolveSteps([{ text: 'ok' }, { text: '{ing:3}' }], ids)
    expect(r).toMatchObject({ ok: false })
    if (!r.ok) expect(r.error).toContain('Step 2')
  })
  it('rejects unknown ids and malformed references', () => {
    expect(resolveSteps([{ text: '{ing:zzz}' }], ids)).toMatchObject({ ok: false })
    expect(resolveSteps([{ text: 'Add {ing:}' }], ids)).toMatchObject({ ok: false })
  })
  it('returns an empty list for no steps', () => {
    expect(resolveSteps([], ids)).toEqual({ ok: true, steps: [] })
  })
})

describe('remapStepTokens', () => {
  const old = new Map([['o1', 'Flour'], ['o2', 'Milk']])
  const fresh = new Map([['flour', 'n1']])
  it('re-points matching names and falls back to plain name', () => {
    expect(remapStepTokens('Sift {ing:o1}, add {ing:o2}, {ing:gone}', old, fresh)).toBe(
      'Sift {ing:n1}, add Milk, {ing:gone}'
    )
  })
})
