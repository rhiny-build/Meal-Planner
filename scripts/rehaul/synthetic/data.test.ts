import { describe, it, expect } from 'vitest'
import { FAMILY_RECIPES, QUICK_ITEMS, URL_RECIPES } from './data'
import { pageFor } from './fixtureServer'
import { splitIngredientLine } from './seedSyntheticBook'

describe('synthetic S07 dataset', () => {
  it('has the shape of the real book: 78 recipes in three groups', () => {
    expect(URL_RECIPES).toHaveLength(46)
    expect(QUICK_ITEMS).toHaveLength(16)
    expect(FAMILY_RECIPES).toHaveLength(16)
  })

  it('contains the two duplicate pairs from the S07 prompt', () => {
    const names = [...URL_RECIPES, ...QUICK_ITEMS, ...FAMILY_RECIPES].map((r) => r.name)
    expect(names.filter((n) => n === 'Easy Asian Cucumber Salad')).toHaveLength(2)
    expect(names.filter((n) => n === 'Pan Fried Sea Bass with Lemon Garlic Herb Sauce')).toHaveLength(2)
  })

  it('covers every page outcome, and dead pages really fail', () => {
    const kinds = new Set(URL_RECIPES.map((r) => r.page))
    expect([...kinds].sort()).toEqual(['404', 'blocked', 'jsonld', 'messy', 'nomethod', 'notrecipe'])
    expect(pageFor(URL_RECIPES.find((r) => r.page === '404')!).status).toBe(404)
    expect(pageFor(URL_RECIPES.find((r) => r.page === 'blocked')!).status).toBe(403)
  })

  it('no-method pages have no method text', () => {
    const page = pageFor(URL_RECIPES.find((r) => r.page === 'nomethod')!).body
    expect(page).not.toMatch(/Method|HowToStep/)
  })

  it('splits ingredient lines into quantity, unit and name', () => {
    expect(splitIngredientLine('4 cloves garlic')).toEqual({ quantity: '4', unit: 'cloves', name: 'garlic' })
    expect(splitIngredientLine('2 tbsp olive oil')).toEqual({ quantity: '2', unit: 'tbsp', name: 'olive oil' })
    expect(splitIngredientLine('salt and pepper')).toEqual({ quantity: null, unit: null, name: 'salt and pepper' })
  })
})
