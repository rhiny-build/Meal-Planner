import { describe, expect, it } from 'vitest'
import { parseReceiptDate, parseReceiptText } from './parseReceipt'
import { receiptLines, type SyntheticOrder } from '@/tests/fixtures/receipts/synthetic'

const order: SyntheticOrder = {
  orderNumber: '7012345678',
  date: '2026-01-27',
  lines: [
    { product: "Sainsbury's Whole Milk 2 Litres", quantity: 2 },
    { product: 'JS Whole Cucumber' },
    { product: "Sainsbury's Taste the Difference Beef Mince 5% Fat", weighKg: 0.42 },
    { product: 'Old El Paso Smoky BBQ Fajita Dinner Kit with extra long name', wrap: true },
  ],
}
const text = receiptLines(order).join('\n')

describe('parseReceiptText', () => {
  const parsed = parseReceiptText(text)

  it('reads order number and delivery date (UTC midnight)', () => {
    expect(parsed.orderNumber).toBe('7012345678')
    expect(parsed.purchaseDate?.toISOString()).toBe('2026-01-27T00:00:00.000Z')
  })

  it('treats a weight-and-price line as a continuation, not a new item', () => {
    expect(parsed.lines.map(l => l.name)).toContain("Sainsbury's Taste the Difference Beef Mince 5% Fat")
    expect(parsed.lineCount).toBe(4)
  })

  it('joins a wrapped product name', () => {
    expect(parsed.lines.map(l => l.name)).toContain('Old El Paso Smoky BBQ Fajita Dinner Kit with extra long name')
  })

  it('counts quantities and compares with "Groceries (N items)"', () => {
    expect(parsed.expectedCount).toBe(5)
    expect(parsed.unitCount).toBe(5)
    expect(parsed.countMatches).toBe(true)
  })

  it('flags a receipt whose parsed count differs from its own count', () => {
    const broken = parseReceiptText(text.replace('Groceries (5 items)', 'Groceries (9 items)'))
    expect(broken.expectedCount).toBe(9)
    expect(broken.countMatches).toBe(false)
  })

  it('reports no match when the receipt has no count heading', () => {
    expect(parseReceiptText('Order number: 1234567\n1 Milk £1.00').countMatches).toBe(false)
  })
})

describe('parseReceiptDate', () => {
  it('ignores the server time zone', () => {
    expect(parseReceiptDate('Slot time: Tuesday 1st December 2026, 9:00am - 10:00am')?.toISOString()).toBe('2026-12-01T00:00:00.000Z')
  })
  it('returns null without a slot time', () => {
    expect(parseReceiptDate('nothing here')).toBeNull()
  })
})
