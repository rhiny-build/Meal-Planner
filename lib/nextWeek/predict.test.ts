import { describe, expect, it } from 'vitest'
import { parseReceiptText } from '@/lib/receipts/parseReceipt'
import { receiptLines, syntheticOrders } from '@/tests/fixtures/receipts/synthetic'
import { fallbackItemName } from './itemName'
import { buildHistory, predict, type PurchaseLine } from './predict'

const addWeeks = (date: string, weeks: number) => new Date(Date.parse(date) + weeks * 7 * 86400000).toISOString().slice(0, 10)

/** Orders where `item` is in the given weeks-ago positions (0 = last order); every order also has a filler item. */
function ordersWith(item: string, weeksAgo: number[], total = 12, last = '2026-10-13'): PurchaseLine[] {
  return Array.from({ length: total }, (_, i) => {
    const date = addWeeks(last, -(total - 1 - i))
    const lines: PurchaseLine[] = [{ date, productName: 'filler', item: 'filler' }]
    if (weeksAgo.includes(total - 1 - i)) lines.push({ date, productName: `JS ${item}`, item })
    return lines
  }).flat()
}
const NEXT = '2026-10-20'

describe('predict: usual weekly items and "do you need these?"', () => {
  it('puts an item in 8 of the last 10 orders in the usual items', () => {
    const history = buildHistory(ordersWith('milk', [0, 1, 2, 3, 4, 5, 6, 7]))
    expect(predict(history, NEXT).usual.map(u => u.item)).toContain('milk')
  })

  it('puts an item in 7 of the last 10 orders under "do you need these?" with a reason', () => {
    const history = buildHistory(ordersWith('grapes', [0, 1, 2, 3, 4, 5, 6]))
    const result = predict(history, NEXT)
    expect(result.usual.map(u => u.item)).not.toContain('grapes')
    expect(result.maybe).toContainEqual(expect.objectContaining({ item: 'grapes', reason: 'In 7 of your last 10 orders', kind: 'share' }))
  })

  it('leaves out an item in 6 of the last 10 orders', () => {
    const history = buildHistory(ordersWith('tea', [0, 1, 2, 3, 4, 5]))
    const result = predict(history, NEXT)
    expect([...result.usual, ...result.maybe].map(m => m.item)).not.toContain('tea')
  })

  it('suggests a restock item bought >= 8 times, on a steady rhythm, now due', () => {
    // every 2 weeks for 16 weeks -> 8 purchases, last bought 2 weeks before the target... target is 1 week after last order
    const history = buildHistory(ordersWith('squash', [1, 3, 5, 7, 9, 11, 13, 15], 16))
    const hit = predict(history, NEXT).maybe.find(m => m.item === 'squash')
    expect(hit?.kind).toBe('restock')
    expect(hit?.reason).toBe('Usually every 2 weeks, last bought 2 weeks ago')
  })

  it('does not suggest a restock item bought fewer than 8 times', () => {
    const history = buildHistory(ordersWith('squash', [1, 3, 5, 7, 9, 11, 13], 16))
    expect(predict(history, NEXT).maybe.map(m => m.item)).not.toContain('squash')
  })

  it('does not suggest a restock item that is not yet due (under 0.9x its gap)', () => {
    const history = buildHistory(ordersWith('squash', [0, 3, 6, 9, 12, 15, 18, 21], 24))
    expect(predict(history, NEXT).maybe.map(m => m.item)).not.toContain('squash')
  })

  it('does not suggest a restock item overdue by more than 2x its gap', () => {
    const history = buildHistory(ordersWith('squash', [6, 8, 10, 12, 14, 16, 18, 20], 24))
    expect(predict(history, NEXT).maybe.map(m => m.item)).not.toContain('squash')
  })

  it('does not suggest an erratic item (spread over 0.6)', () => {
    const history = buildHistory(ordersWith('squash', [1, 2, 4, 9, 10, 17, 19, 24], 26))
    expect(predict(history, NEXT).maybe.map(m => m.item)).not.toContain('squash')
  })

  it('predicts nothing with fewer than 4 earlier orders', () => {
    const history = buildHistory(ordersWith('milk', [0, 1, 2], 3))
    expect(predict(history, NEXT)).toEqual({ usual: [], maybe: [] })
  })

  it('shows the product bought most recently for each item', () => {
    const lines = [
      ...ordersWith('milk', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
      { date: '2026-10-13', productName: 'Sainsbury\'s Milk NEW', item: 'milk' },
    ]
    expect(predict(buildHistory(lines), NEXT).usual.find(u => u.item === 'milk')?.lastProduct).toBe("Sainsbury's Milk NEW")
  })
})

describe('backtest on synthetic receipts (53 weekly orders, parsed from receipt text)', () => {
  const orders = syntheticOrders(53)
  const lines: PurchaseLine[] = orders.flatMap(order => {
    const parsed = parseReceiptText(receiptLines(order).join('\n'))
    return parsed.lines.map(l => ({ date: order.date, productName: l.name, item: fallbackItemName(l.name) }))
  })
  const history = buildHistory(lines)

  it('parses every synthetic receipt with a matching count', () => {
    for (const order of orders) expect(parseReceiptText(receiptLines(order).join('\n')).countMatches).toBe(true)
  })

  it('usual weekly items are right at least 80% of the time across the last 8 orders', () => {
    const rates = history.orders.slice(-8).map(target => {
      const usual = predict(history, target).usual.map(u => u.item)
      const actual = history.baskets.get(target)!
      return usual.filter(item => actual.has(item)).length / usual.length
    })
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length
    expect(mean).toBeGreaterThanOrEqual(0.8)
  })
})
