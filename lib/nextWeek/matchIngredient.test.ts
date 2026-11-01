import { describe, expect, it } from 'vitest'
import { exactItemMatch, ingredientKey, matchIngredient } from './matchIngredient'

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

describe('ingredientKey', () => {
  it.each([
    ['Sweet Corn', 'sweet corn'],
    ['  Garlic   POWDER ', 'garlic powder'],
    ['chicken breast, diced', 'chicken breast'],
    ['tomatoes (tinned)', 'tomatoes'],
    ['½ teaspoon kosher salt', 'teaspoon kosher salt'],
  ])('%s -> %s', (name, key) => expect(ingredientKey(name)).toBe(key))

  it('keeps words that change what you buy', () => {
    expect(ingredientKey('chopped tomatoes')).not.toBe(ingredientKey('tomatoes'))
  })
})

describe('exactItemMatch', () => {
  const known = [
    { item: 'tomato', bought: 12 },
    { item: 'chopped tomatoes', bought: 22 },
    { item: 'grated mozzarella', bought: 5 },
    { item: 'sweets', bought: 9 },
    { item: 'garlic', bought: 30 },
  ]
  it('matches the same words, plurals ignored', () => {
    expect(exactItemMatch('Tomatoes', known)).toBe('tomato')
    expect(exactItemMatch('chopped tomatoes', known)).toBe('chopped tomatoes')
    expect(exactItemMatch('Garlic', known)).toBe('garlic')
  })
  it('matches once filler is dropped, when only one item fits', () => {
    expect(exactItemMatch('mozzarella', known)).toBe('grated mozzarella')
  })
  it('does not guess between two items that differ only by filler', () => {
    expect(exactItemMatch('canned tomatoes', known)).toBeNull()
  })
  it('never matches on a shared word', () => {
    expect(exactItemMatch('Sweet Corn', known)).toBeNull()
    expect(exactItemMatch('Garlic powder', known)).toBeNull()
  })
})
