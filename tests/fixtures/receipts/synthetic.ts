/**
 * Synthetic Sainsbury's receipts for tests. Everything here is invented (names, order numbers, rhythm);
 * no real receipt is ever committed. The layout mirrors the real PDFs: order number and slot time at the top,
 * "Groceries (N items)", a quantity then name then price per line, long names wrapping onto a second line,
 * weighed items carrying their weight and price on a line of their own.
 */

import { PDFDocument, StandardFonts } from 'pdf-lib'

export interface SyntheticLine {
  product: string
  quantity?: number
  /** Weighed item, e.g. 0.42 -> the weight line "0.42kg £8.50" follows the name */
  weighKg?: number
  /** Force the name to wrap onto a second line */
  wrap?: boolean
}

export interface SyntheticOrder {
  orderNumber: string
  /** YYYY-MM-DD, a Tuesday */
  date: string
  lines: SyntheticLine[]
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const ordinal = (n: number) => (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th')

export function receiptLines(order: SyntheticOrder): string[] {
  const [y, m, d] = order.date.split('-').map(Number)
  const weekday = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  const units = order.lines.reduce((sum, l) => sum + (l.weighKg ? 1 : (l.quantity ?? 1)), 0)
  const out = [
    'Your Sainsbury\'s order',
    `Order number: ${order.orderNumber}`,
    `Slot time: ${weekday} ${d}${ordinal(d)} ${MONTHS[m - 1]} ${y}, 9:00am - 10:00am`,
    `Groceries (${units} items)`,
  ]
  for (const line of order.lines) {
    const price = `£${(1 + (line.product.length % 7) + 0.25).toFixed(2)}`
    if (line.weighKg) {
      out.push(`1 ${line.product}`, `${line.weighKg}kg ${price}`)
    } else if (line.wrap) {
      const cut = Math.floor(line.product.length / 2)
      const at = line.product.lastIndexOf(' ', cut)
      out.push(`${line.quantity ?? 1} ${line.product.slice(0, at)}`, `${line.product.slice(at + 1)}${price}`)
    } else {
      out.push(`${line.quantity ?? 1} ${line.product} ${price}`)
    }
  }
  out.push('Order summary', 'Total £99.99')
  return out
}

/** Deterministic pseudo-random numbers (mulberry32) so fixtures are the same on every run. */
export function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WEEK_MS = 7 * 24 * 3600 * 1000
const addWeeks = (date: string, weeks: number) => new Date(Date.parse(date) + weeks * WEEK_MS).toISOString().slice(0, 10)

const STAPLES = ["Sainsbury's Semi Skimmed Milk 4 Pints", "Sainsbury's Whole Cucumber", 'Bananas Loose', "Sainsbury's Free Range Eggs Large x12", 'Warburtons White Pittas x4', 'Pepsi Max 2L', 'Fitzgeralds Sourdough Bagels', 'Müller Light Strawberry', 'Round Tomatoes x6', 'Strawberries 250g', 'Bavarian Smoked Ham Slices', "Sainsbury's Grated Mozzarella 250g"]
const COMMON = ['White Seedless Grapes 500g', 'Sabra Houmous 200g', "Sainsbury's Baby Plum Tomatoes 250g", 'Nurofen 200mg x16']
const RESTOCK: [string, number][] = [['Toilet Tissue x16', 2], ['Nutella 350g', 3], ['Summer Fruits Squash 1L', 2], ['Carrots 500g', 3]]
const ONE_OFFS = ['Pukka Chai Tea', 'Ocado Birthday Candles', 'Quorn Pieces 300g', 'Lemon Curd 340g', 'Garlic Bread x2', 'Salted Pretzels', 'Mango Chutney', 'Haribo Starmix', 'Tinned Chickpeas', 'Kitchen Roll x4', 'Anchovy Fillets', 'Fig Rolls']

/**
 * `count` weekly Tuesday orders ending on `lastDate`. Staples are bought almost every week, "common" items about
 * three weeks in four, restock items on a steady rhythm, plus a few random one-offs.
 */
export function syntheticOrders(count: number, lastDate = '2026-10-13', seed = 7): SyntheticOrder[] {
  const rand = seeded(seed)
  return Array.from({ length: count }, (_, i) => {
    const date = addWeeks(lastDate, -(count - 1 - i))
    const lines: SyntheticLine[] = []
    for (const product of STAPLES) if (rand() < 0.93) lines.push({ product, quantity: rand() < 0.15 ? 2 : 1 })
    for (const product of COMMON) if (rand() < 0.75) lines.push({ product })
    for (const [product, every] of RESTOCK) if ((count - 1 - i) % every === 0) lines.push({ product })
    for (let k = 0; k < 3; k++) lines.push({ product: ONE_OFFS[Math.floor(rand() * ONE_OFFS.length)], wrap: rand() < 0.3 })
    lines.push({ product: "Sainsbury's Taste the Difference Beef Mince 5% Fat", weighKg: 0.3 + Math.floor(rand() * 40) / 100 })
    const orderNumber = String(7000000000 + i * 137 + Math.floor(seed))
    // de-duplicate by product (one line per product per order)
    const seen = new Set<string>()
    return { orderNumber, date, lines: lines.filter(l => !seen.has(l.product) && seen.add(l.product)) }
  })
}

/** A one-page PDF whose text layer holds the given lines, one text line each (what pdf-parse reads back). */
export async function makePdf(lines: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const page = doc.addPage([595, 842])
  lines.forEach((line, i) => page.drawText(line, { x: 40, y: 800 - i * 13, size: 10, font }))
  return Buffer.from(await doc.save({ useObjectStreams: false }))
}

export const orderPdf = (order: SyntheticOrder) => makePdf(receiptLines(order))
