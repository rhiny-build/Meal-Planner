import { describe, it, expect } from 'vitest'
import { getCookIngredients } from './getCookIngredients'

describe('getCookIngredients', () => {
  it('should use structured ingredients when present', () => {
    const result = getCookIngredients({
      ingredients: 'ignored',
      structuredIngredients: [
        { id: 'a', name: 'flour', quantity: '200', unit: 'g', amount: 200, notes: null },
      ],
    })
    expect(result).toEqual([
      { id: 'a', name: 'flour', quantity: '200', unit: 'g', amount: 200, notes: null },
    ])
  })

  it('should fall back to one unscaled entry per legacy text line', () => {
    const result = getCookIngredients({
      ingredients: '2 onions\n\n  1 tin tomatoes \n',
      structuredIngredients: [],
    })
    expect(result.map((i) => i.name)).toEqual(['2 onions', '1 tin tomatoes'])
    expect(result[0].amount).toBeUndefined()
  })

  it('should return an empty list when there is nothing', () => {
    expect(getCookIngredients({ ingredients: '', structuredIngredients: [] })).toEqual([])
  })
})
