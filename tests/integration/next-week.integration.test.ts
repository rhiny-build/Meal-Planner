// @vitest-environment node
/**
 * Next week list: receipts in, rebuild from raw, product -> item mapping, the loaded list.
 * Uses synthetic receipt PDFs (tests/fixtures/receipts) and the local raw-receipt store (.receipts-dev/).
 */

import { promises as fs } from 'fs'
import path from 'path'
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { testPrisma, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'
import { ingestReceiptPdf, reparseStoredReceipt } from '@/lib/receipts/ingest'
import { getPdf, receiptPath } from '@/lib/receipts/storage'
import { classifyNewProducts, type ClassifyCall } from '@/lib/nextWeek/classifyProducts'
import { loadNextWeek } from '@/lib/nextWeek/loadNextWeek'
import { orderPdf, syntheticOrders } from '../fixtures/receipts/synthetic'

const orders = syntheticOrders(12)

describe('Next week list integration', { timeout: 60000 }, () => {
  beforeAll(async () => { await setupTestDatabase() })
  afterAll(async () => {
    await fs.rm(path.join(process.cwd(), '.receipts-dev'), { recursive: true, force: true })
    await teardownTestDatabase()
  })
  beforeEach(async () => { await clearTestDatabase() })

  const uploadAll = () => Promise.all(orders.map(async o => ingestReceiptPdf(testPrisma, await orderPdf(o), `${o.orderNumber}.pdf`)))

  it('stores receipts, items and the raw PDF; reports counts', async () => {
    const reports = await uploadAll()
    expect(reports.every(r => r.status === 'new' && r.countMatches)).toBe(true)
    expect(await testPrisma.receipt.count()).toBe(12)
    const expectedLines = orders.reduce((n, o) => n + o.lines.length, 0)
    expect(await testPrisma.purchaseHistory.count()).toBe(expectedLines)
    expect((await getPdf(receiptPath(orders[0].orderNumber)))?.subarray(0, 4).toString()).toBe('%PDF')
  })

  it('uploading the same receipts twice does not duplicate anything', async () => {
    await uploadAll()
    const before = await testPrisma.purchaseHistory.count()
    const second = await uploadAll()
    expect(second.every(r => r.status === 'replaced')).toBe(true)
    expect(await testPrisma.purchaseHistory.count()).toBe(before)
    expect(await testPrisma.receipt.count()).toBe(12)
  })

  it('reports a receipt that cannot be read, and stores nothing for it', async () => {
    const report = await ingestReceiptPdf(testPrisma, Buffer.from('not a pdf'), 'junk.pdf')
    expect(report.status).toBe('failed')
    expect(await testPrisma.receipt.count()).toBe(0)
  })

  it('rebuild re-parses every stored receipt and repairs the history', async () => {
    await uploadAll()
    const expected = await testPrisma.purchaseHistory.count()
    await testPrisma.purchaseHistory.deleteMany({ where: { orderNumber: orders[3].orderNumber } })
    await testPrisma.purchaseHistory.updateMany({ where: { orderNumber: orders[4].orderNumber }, data: { rawName: 'garbled' } })
    for (const o of orders) await reparseStoredReceipt(testPrisma, o.orderNumber)
    expect(await testPrisma.purchaseHistory.count()).toBe(expected)
    expect(await testPrisma.purchaseHistory.count({ where: { rawName: 'garbled' } })).toBe(0)
  })

  it('maps each new product name once and never overwrites a correction', async () => {
    await uploadAll()
    const calls: string[][] = []
    const fake: ClassifyCall = async names => {
      calls.push(names)
      return names.map(name => ({ name, item: name.toLowerCase().includes('milk') ? 'semi skimmed milk' : 'thing', aisle: 'Dairy and eggs', cupboard: false }))
    }
    const first = await classifyNewProducts(testPrisma, fake, 1000)
    expect(first.remaining).toBe(0)
    const mapped = await testPrisma.productMapping.count()
    expect(mapped).toBe(new Set(orders.flatMap(o => o.lines.map(l => l.product))).size)

    await testPrisma.productMapping.updateMany({ where: { productName: { contains: 'Cucumber' } }, data: { itemName: 'cucumber', aisle: 'Fresh produce', corrected: true } })
    const second = await classifyNewProducts(testPrisma, fake, 1000)
    expect(second).toEqual({ classified: 0, remaining: 0 })
    expect(calls).toHaveLength(1) // no second model call for names already mapped
    expect((await testPrisma.productMapping.findFirst({ where: { productName: { contains: 'Cucumber' } } }))?.itemName).toBe('cucumber')
  })

  it('classifies in batches and falls back for a name the model skips', async () => {
    await uploadAll()
    const skipFirst: ClassifyCall = async names => names.slice(1).map(name => ({ name, item: 'x', aisle: 'Not an aisle', cupboard: true }))
    const result = await classifyNewProducts(testPrisma, skipFirst, 5)
    expect(result.classified).toBe(5)
    expect(result.remaining).toBeGreaterThan(0)
    const rows = await testPrisma.productMapping.findMany()
    expect(rows.some(r => r.aisle === 'Other')).toBe(true)
  })

  it('builds the list from the stored history and next week\'s meal plan', async () => {
    await uploadAll()
    await classifyNewProducts(testPrisma, async names => names.map(name => ({ name, item: name.toLowerCase().replace(/[^a-z ]/g, '').trim(), aisle: 'Fresh produce', cupboard: false })), 1000)
    const recipe = await testPrisma.recipe.create({
      data: { name: 'Cucumber Salad', ingredients: 'cucumber', tier: 'favorite', structuredIngredients: { create: [{ name: 'cucumber', order: 0 }, { name: 'smoked paprika', order: 1 }] } },
    })
    const weekStart = new Date(2026, 9, 19) // Monday 19 October 2026
    await testPrisma.mealPlan.create({ data: { date: weekStart, dayOfWeek: 'Monday', proteinRecipeId: recipe.id } })

    const data = await loadNextWeek(testPrisma, weekStart, new Date(2026, 9, 14))
    expect(data.orderCount).toBe(12)
    expect(data.orderDate).toBe('2026-10-20')
    expect(data.list.meals).toHaveLength(1)
    const lines = data.list.meals[0].lines
    expect(lines.find(l => l.label.includes('Cucumber'))).toMatchObject({ ticked: true })
    expect(lines.find(l => l.label === 'smoked paprika')).toMatchObject({ ticked: false, why: expect.stringContaining('check') })
    expect(data.list.usual.flatMap(g => g.lines).length).toBeGreaterThan(5)
  })
})
