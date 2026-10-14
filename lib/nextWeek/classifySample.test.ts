import { describe, expect, it } from 'vitest'
import sample from '@/tests/fixtures/receipts/classify-sample.json'
import { isAisle } from './aisles'
import { matchIngredient } from './matchIngredient'

/** Recorded answers of the real cheap model on 50 product names (scripts/next-week/try-classify.ts). */
describe('recorded product -> item sample', () => {
  it('has a valid aisle for every product and groups own-brand and JS versions together', () => {
    expect(sample).toHaveLength(50)
    for (const p of sample) expect(isAisle(p.aisle)).toBe(true)
    const cucumbers = sample.filter(p => p.name.toLowerCase().includes('cucumber'))
    expect(new Set(cucumbers.map(p => p.item)).size).toBe(1)
  })

  it('lets recipe ingredients find the items', () => {
    const items = sample.map(p => ({ item: p.item, bought: 1 }))
    expect(matchIngredient('pasta', items)).toBe('fusilli pasta')
    expect(matchIngredient('salmon fillets', items)).toBe('salmon fillet')
    expect(matchIngredient('peas', items)).toBe('garden peas')
    expect(matchIngredient('lemons', items)).toBe('lemon')
    expect(matchIngredient('extra virgin olive oil', items)).toBe('olive oil')
  })
})
