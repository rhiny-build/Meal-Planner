import { describe, it, expect } from 'vitest'
import { prepareIngredients, composeIngredientsText, RecipeValidationError } from './recipeWrite'

describe('prepareIngredients', () => {
  it('sets a numeric amount from the quantity', () => {
    const rows = prepareIngredients(
      [{ id: 'a1', name: 'Flour', quantity: '1 1/2', unit: 'cups', order: 0 }],
      undefined
    )!
    expect(rows[0]).toMatchObject({ id: 'a1', quantity: '1 1/2', unit: 'cups', amount: 1.5, order: 0 })
  })

  it('leaves amount null for free text', () => {
    const rows = prepareIngredients([{ name: 'Salt', quantity: 'a pinch', order: 0 }], undefined)!
    expect(rows[0].amount).toBeNull()
    expect(rows[0].quantity).toBe('a pinch')
  })

  it('drops blank rows and renumbers order', () => {
    const rows = prepareIngredients(
      [
        { name: ' ', order: 0 },
        { name: 'Rice', order: 5 },
      ],
      undefined
    )!
    expect(rows).toHaveLength(1)
    expect(rows[0].order).toBe(0)
  })

  it('parses text lines when there is no structured data', () => {
    const rows = prepareIngredients(undefined, '2 cups rice\nsalt')!
    expect(rows.map((r) => r.name)).toEqual(['rice', 'salt'])
    expect(rows[0].amount).toBe(2)
  })

  it('rejects bad and duplicate ids', () => {
    expect(() => prepareIngredients([{ id: 'a b', name: 'x', order: 0 }], undefined)).toThrow(
      RecipeValidationError
    )
    expect(() =>
      prepareIngredients(
        [
          { id: 'a', name: 'x', order: 0 },
          { id: 'a', name: 'y', order: 1 },
        ],
        undefined
      )
    ).toThrow(RecipeValidationError)
  })

  it('composes the legacy text', () => {
    const rows = prepareIngredients(
      [{ name: 'onion', quantity: '1', notes: 'diced', order: 0 }],
      undefined
    )!
    expect(composeIngredientsText(rows)).toBe('1 onion (diced)')
  })
})
