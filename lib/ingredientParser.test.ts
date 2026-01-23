/**
 * Ingredient Parser Tests
 *
 * Tests for parsing ingredient strings into structured data.
 */

import { describe, it, expect } from 'vitest'
import { parseIngredientLine } from './ingredientParser'

describe('parseIngredientLine', () => {
  it('should parse a simple quantity + unit + ingredient', () => {
    const result = parseIngredientLine('2 cups flour')
    expect(result).toEqual({
      name: 'flour',
      quantity: '2',
      unit: 'cups',
      notes: undefined,
    })
  })

  it('should parse fractional quantities', () => {
    const result = parseIngredientLine('1/2 teaspoon salt')
    expect(result).toEqual({
      name: 'salt',
      quantity: '1/2',
      unit: 'teaspoon',
      notes: undefined,
    })
  })

  it('should parse mixed number quantities', () => {
    const result = parseIngredientLine('1 1/2 cups sugar')
    expect(result).toEqual({
      name: 'sugar',
      quantity: '1 1/2',
      unit: 'cups',
      notes: undefined,
    })
  })

  it('should parse ingredient with notes in parentheses', () => {
    const result = parseIngredientLine('2 cups chicken breast (diced)')
    expect(result).toEqual({
      name: 'chicken breast',
      quantity: '2',
      unit: 'cups',
      notes: 'diced',
    })
  })

  it('should parse ingredient with notes after comma', () => {
    const result = parseIngredientLine('1 lb ground beef, thawed')
    expect(result).toEqual({
      name: 'ground beef',
      quantity: '1',
      unit: 'lb',
      notes: 'thawed',
    })
  })

  it('should handle ingredient without quantity or unit', () => {
    const result = parseIngredientLine('Salt and pepper to taste')
    expect(result.name).toBe('Salt and pepper to taste')
    expect(result.quantity).toBeUndefined()
    expect(result.unit).toBeUndefined()
  })

  it('should handle ingredient with only quantity (no unit)', () => {
    const result = parseIngredientLine('3 eggs')
    expect(result).toEqual({
      name: 'eggs',
      quantity: '3',
      unit: undefined,
      notes: undefined,
    })
  })

  it('should handle empty string', () => {
    const result = parseIngredientLine('')
    expect(result.name).toBe('')
  })

  it('should handle whitespace-only string', () => {
    const result = parseIngredientLine('   ')
    expect(result.name).toBe('')
  })

  it('should trim whitespace from input', () => {
    const result = parseIngredientLine('  2 cups flour  ')
    expect(result.name).toBe('flour')
    expect(result.quantity).toBe('2')
  })

  it('should handle various units', () => {
    const testCases = [
      { input: '1 tablespoon olive oil', expected: { name: 'olive oil', quantity: '1', unit: 'tablespoon' } },
      { input: '2 tbsp soy sauce', expected: { name: 'soy sauce', quantity: '2', unit: 'tbsp' } },
      { input: '500 grams chicken', expected: { name: 'chicken', quantity: '500', unit: 'grams' } },
      { input: '1 can tomatoes', expected: { name: 'tomatoes', quantity: '1', unit: 'can' } },
      { input: '3 cloves garlic', expected: { name: 'garlic', quantity: '3', unit: 'cloves' } },
    ]

    for (const { input, expected } of testCases) {
      const result = parseIngredientLine(input)
      expect(result.name).toBe(expected.name)
      expect(result.quantity).toBe(expected.quantity)
      expect(result.unit).toBe(expected.unit)
    }
  })

  it('should handle decimal quantities', () => {
    const result = parseIngredientLine('2.5 cups milk')
    expect(result).toEqual({
      name: 'milk',
      quantity: '2.5',
      unit: 'cups',
      notes: undefined,
    })
  })
})
