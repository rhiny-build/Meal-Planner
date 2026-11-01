// @vitest-environment node
/**
 * Ingredient matching: one saved answer per name, the model only for names without one,
 * Ronen's picks never overwritten, "none"/"unsure" asked again when his items change.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { testPrisma, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'
import { ingredientKey } from '@/lib/nextWeek/matchIngredient'
import type { MatchItem } from '@/lib/nextWeek/matchPrompt'
import { itemsVersion, resolveIngredientMatches, type MatchCall, type ModelAnswer } from '@/lib/nextWeek/resolveMatches'
import { loadNextWeek } from '@/lib/nextWeek/loadNextWeek'
import { classifyNewProducts, type ClassifyCall } from '@/lib/nextWeek/classifyProducts'
import { ingestReceiptPdf } from '@/lib/receipts/ingest'
import { orderPdf, syntheticOrders } from '../fixtures/receipts/synthetic'

const items: MatchItem[] = [
  { item: 'sweetcorn', aisle: 'Fresh produce', bought: 8 },
  { item: 'sweets', aisle: 'Drinks and snacks', bought: 9 },
  { item: 'turkey mince', aisle: 'Meat and deli', bought: 6 },
]
const moreItems: MatchItem[] = [...items, { item: 'garlic powder', aisle: 'Cupboard', bought: 2 }]

/** A scripted model that records what it was asked. */
function scripted(script: Record<string, ModelAnswer['decision'] | string>) {
  const asked: string[][] = []
  const call: MatchCall = async names => {
    asked.push(names)
    return names.map<ModelAnswer>(name => {
      const v = script[name] ?? 'none'
      return v === 'none' || v === 'unsure' ? { name, decision: v } : { name, decision: 'item', item: v }
    })
  }
  return { call, asked }
}

describe('ingredient matching', { timeout: 60000 }, () => {
  beforeAll(async () => { await setupTestDatabase() })
  afterAll(async () => { await teardownTestDatabase() })
  beforeEach(async () => { await clearTestDatabase() })

  it('an exact match is saved without asking the model', async () => {
    const { call, asked } = scripted({})
    const { matches } = await resolveIngredientMatches(testPrisma, ['Sweetcorn', 'turkey mince'], items, call)
    expect(asked).toHaveLength(0)
    expect(matches.get('sweetcorn')).toMatchObject({ status: 'matched', itemName: 'sweetcorn', source: 'exact' })
    expect(await testPrisma.ingredientMatch.count()).toBe(2)
  })

  it('asks the model once per distinct name, saves the answer, and reuses it', async () => {
    const { call, asked } = scripted({ 'Sweet Corn': 'sweetcorn', 'Ground Turkey': 'turkey mince', Saffron: 'none', Dressing: 'unsure' })
    const names = ['Sweet Corn', 'sweet corn', 'Ground Turkey', 'Saffron', 'Dressing']
    const first = await resolveIngredientMatches(testPrisma, names, items, call)
    expect(asked).toHaveLength(1)
    expect(asked[0]).toEqual(['Sweet Corn', 'Ground Turkey', 'Saffron', 'Dressing']) // "sweet corn" is the same name
    expect(first.matches.get(ingredientKey('Sweet Corn'))).toMatchObject({ status: 'matched', itemName: 'sweetcorn', source: 'model' })
    expect(first.matches.get('saffron')).toMatchObject({ status: 'none', itemName: null })
    expect(first.matches.get('dressing')).toMatchObject({ status: 'unsure', itemName: null })

    const second = await resolveIngredientMatches(testPrisma, names, items, call)
    expect(asked).toHaveLength(1) // no second call
    expect(second.matches.get('ground turkey')).toMatchObject({ itemName: 'turkey mince' })
  })

  it('treats an item the model made up as unsure', async () => {
    const { call } = scripted({ Mystery: 'unicorn steak' })
    const { matches } = await resolveIngredientMatches(testPrisma, ['Mystery'], items, call)
    expect(matches.get('mystery')).toMatchObject({ status: 'unsure', itemName: null })
  })

  it('a failed model call saves nothing and does not throw; the names are tried again next time', async () => {
    const failing: MatchCall = async () => { throw new Error('API down') }
    const result = await resolveIngredientMatches(testPrisma, ['Saffron'], items, failing)
    expect(result.unresolved).toBe(1)
    expect(result.matches.size).toBe(0)
    expect(await testPrisma.ingredientMatch.count()).toBe(0)
    const { call, asked } = scripted({})
    await resolveIngredientMatches(testPrisma, ['Saffron'], items, call)
    expect(asked).toHaveLength(1)
  })

  it('never overwrites a pick Ronen made, even when the items change', async () => {
    await testPrisma.ingredientMatch.create({ data: { name: 'garlic powder', itemName: null, status: 'none', source: 'ronen' } })
    const { call, asked } = scripted({ 'Garlic powder': 'garlic powder' })
    const { matches } = await resolveIngredientMatches(testPrisma, ['Garlic powder'], moreItems, call)
    expect(asked).toHaveLength(0)
    expect(matches.get('garlic powder')).toMatchObject({ status: 'none', source: 'ronen' })
    expect(await testPrisma.ingredientMatch.findUnique({ where: { name: 'garlic powder' } })).toMatchObject({ status: 'none', source: 'ronen' })
  })

  it('does not overwrite a pick Ronen makes while the model is still answering', async () => {
    const slow: MatchCall = async names => {
      await testPrisma.ingredientMatch.create({ data: { name: 'sweet corn', itemName: 'sweets', status: 'matched', source: 'ronen' } })
      return names.map(name => ({ name, decision: 'item' as const, item: 'sweetcorn' }))
    }
    await resolveIngredientMatches(testPrisma, ['Sweet Corn'], items, slow)
    expect(await testPrisma.ingredientMatch.findUnique({ where: { name: 'sweet corn' } })).toMatchObject({ itemName: 'sweets', source: 'ronen' })
  })

  it('asks again about "not bought" and "unsure" when Ronen\'s items change, but not about matched ones', async () => {
    const first = scripted({ 'Garlic powder': 'none', Dressing: 'unsure', 'Sweet Corn': 'sweetcorn' })
    await resolveIngredientMatches(testPrisma, ['Garlic powder', 'Dressing', 'Sweet Corn'], items, first.call)
    expect(first.asked).toHaveLength(1)

    const same = scripted({})
    await resolveIngredientMatches(testPrisma, ['Garlic powder', 'Dressing', 'Sweet Corn'], items, same.call)
    expect(same.asked).toHaveLength(0) // nothing changed

    const changed = scripted({ Dressing: 'unsure' })
    const { matches } = await resolveIngredientMatches(testPrisma, ['Garlic powder', 'Dressing', 'Sweet Corn'], moreItems, changed.call)
    // Sweet Corn is matched: not asked again. Garlic powder is now an exact match for a new item: no model needed.
    expect(changed.asked).toEqual([['Dressing']])
    expect(matches.get('garlic powder')).toMatchObject({ status: 'matched', itemName: 'garlic powder', source: 'exact' })
    expect((await testPrisma.ingredientMatch.findUnique({ where: { name: 'dressing' } }))?.itemsVersion).toBe(itemsVersion(moreItems))
  })

  it('stops asking the model once the time budget is spent, keeping what it saved', async () => {
    let clock = 0
    // Names are made of letters only (digits are not part of a name's key), 676 distinct ones
    const letter = (n: number) => String.fromCharCode(97 + n)
    const names = Array.from({ length: 200 }, (_, i) => `thing ${letter(Math.floor(i / 26))}${letter(i % 26)}`)
    const { call, asked } = scripted({})
    const ticking: MatchCall = async (n, it) => { clock += 100_000; return call(n, it) }
    const result = await resolveIngredientMatches(testPrisma, names, items, ticking, { budgetMs: 150_000, now: () => clock })
    expect(asked.length).toBeLessThan(5)
    expect(result.unresolved).toBeGreaterThan(0)
    expect(await testPrisma.ingredientMatch.count()).toBe(result.asked)
  })
})

describe('Next week uses the saved answers', { timeout: 60000 }, () => {
  const orders = syntheticOrders(12)
  beforeAll(async () => { await setupTestDatabase() })
  afterAll(async () => { await teardownTestDatabase() })
  beforeEach(async () => { await clearTestDatabase() })

  it('builds the meal lines from saved answers and asks the model only for names without one', async () => {
    await Promise.all(orders.map(async o => ingestReceiptPdf(testPrisma, await orderPdf(o), `${o.orderNumber}.pdf`)))
    const fake: ClassifyCall = async names => names.map(name => ({ name, item: /cucumber/i.test(name) ? 'cucumber' : 'thing', aisle: 'Fresh produce', cupboard: false }))
    await classifyNewProducts(testPrisma, fake, 1000)

    const recipe = await testPrisma.recipe.create({
      data: {
        name: 'Salad', ingredients: 'cucumber\nmystery', tier: 'favorite',
        structuredIngredients: { create: [{ name: 'Cucumber', order: 0 }, { name: 'Mystery thing', order: 1 }, { name: 'Saffron', order: 2 }] },
      },
    })
    // Next week, Monday-start: plan the recipe on a day of that week
    const { nextWeekStart } = await import('@/lib/nextWeek/loadNextWeek')
    const start = nextWeekStart(new Date(), 1)
    start.setHours(0, 0, 0, 0)
    await testPrisma.mealPlan.create({ data: { date: start, dayOfWeek: 'Monday', proteinRecipeId: recipe.id } })
    await testPrisma.ingredientMatch.create({ data: { name: 'saffron', itemName: null, status: 'none', source: 'ronen' } })

    const asked: string[][] = []
    const call: MatchCall = async names => { asked.push(names); return names.map(name => ({ name, decision: 'unsure' as const })) }

    const data = await loadNextWeek(testPrisma, start, new Date(), call)
    expect(asked).toEqual([['Mystery thing']]) // Cucumber is exact, Saffron is Ronen's
    const lines = data.list.meals[0].lines
    expect(lines.find(l => l.item === 'cucumber')).toMatchObject({ match: 'matched', ticked: true })
    expect(lines.find(l => l.label === 'Mystery thing')).toMatchObject({ match: 'check', ticked: false, why: expect.stringContaining('check') })
    expect(lines.find(l => l.label === 'Saffron')).toMatchObject({ match: 'none', ticked: false })

    // A second visit does not call the model again
    await loadNextWeek(testPrisma, start, new Date(), call)
    expect(asked).toHaveLength(1)
    expect(data.items.map(i => i.item)).toContain('cucumber')
  })
})
