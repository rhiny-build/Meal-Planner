import { describe, expect, it } from 'vitest'
import { matchIngredient } from './matchIngredient'

const items = [
  { item: 'chicken breast', bought: 30 },
  { item: 'chicken thigh', bought: 5 },
  { item: 'onion', bought: 40 },
  { item: 'red onion', bought: 3 },
  { item: 'olive oil', bought: 6 },
  { item: 'garlic', bought: 20 },
]

describe('matchIngredient', () => {
  it.each([
    ['chicken breast', 'chicken breast'],
    ['2 skinless chicken breasts, diced', 'chicken breast'],
    ['Onions', 'onion'],
    ['red onion', 'red onion'],
    ['garlic cloves', 'garlic'],
    ['extra virgin olive oil', 'olive oil'],
  ])('%s -> %s', (ingredient, expected) => {
    expect(matchIngredient(ingredient, items)).toBe(expected)
  })

  it('prefers the item bought most often on a tie', () => {
    expect(matchIngredient('chicken', items)).toBe('chicken breast')
  })

  it('returns null for something never bought', () => {
    expect(matchIngredient('smoked paprika', items)).toBeNull()
  })
})
