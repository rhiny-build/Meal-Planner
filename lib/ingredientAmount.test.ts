import { describe, it, expect } from 'vitest'
import { parseAmount } from './ingredientAmount'

describe('parseAmount', () => {
  it.each([
    ['2', null, 2, null],
    ['1/2', null, 0.5, null],
    ['1 1/2', 'pounds', 1.5, 'pounds'],
    ['1.5', 'kg', 1.5, 'kg'],
    ['1/4', 'cup', 0.25, 'cup'],
    ['500g', null, 500, 'g'],
    ['500 g', null, 500, 'g'],
    ['1 1/2 pounds', null, 1.5, 'pounds'],
    ['1/4 cup', null, 0.25, 'cup'],
    ['½', null, 0.5, null],
    ['1½', 'cups', 1.5, 'cups'],
    ['1/3', null, 0.3333, null],
    ['  3  ', 'cloves', 3, 'cloves'],
    ['500g', 'g', 500, 'g'],
    ['2 Large', null, 2, 'Large'],
  ])('parses %j + %j', (q, u, amount, unit) => {
    expect(parseAmount(q, u)).toEqual({ amount, unit })
  })

  it.each([
    ['2-3'], ['2 to 3'], ['2 or 3'], ['2 + 1/2'], ['a pinch'], ['to taste'],
    ['1 can (400g)'], ['0'], ['0/0'], ['1/0'], [''], ['  '], ['-1'], ['some'], ['2 xyzzy'],
  ])('leaves %j null', (q) => {
    expect(parseAmount(q).amount).toBeNull()
  })

  it('handles null / undefined quantity and keeps the unit field', () => {
    expect(parseAmount(null, 'g')).toEqual({ amount: null, unit: 'g' })
    expect(parseAmount(undefined)).toEqual({ amount: null, unit: null })
  })

  it('is ambiguous when embedded and given units disagree', () => {
    expect(parseAmount('500g', 'cups').amount).toBeNull()
  })
})
