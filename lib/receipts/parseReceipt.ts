/**
 * Sainsbury's receipt parser (text of the order PDF -> order number, date, product lines).
 *
 * Ported from the old restock-agent sandbox (removed) with three changes:
 *  - a line that only carries a weight and price ("0.42kg £8.50") is a continuation of the product above it;
 *  - variable weights ("0.42kg") are stripped from product names, so the same product has the same name every week;
 *  - every receipt reports its parsed count next to its "Groceries (N items)" count, so a mis-parse is visible.
 */

export interface ReceiptLine {
  /** Product name as printed, without the leading quantity and without a variable weight */
  name: string
  /** Units bought: "2" -> 2; a weighed line ("0.42kg") counts as 1 */
  quantity: number
}

export interface ParsedReceipt {
  orderNumber: string | null
  purchaseDate: Date | null
  /** N from "Groceries (N items)", when the receipt has that heading */
  expectedCount: number | null
  lines: ReceiptLine[]
  /** Product lines parsed (a "2 x milk" line is one line) */
  lineCount: number
  /** Product lines parsed, counting quantities (a "2 x milk" line is two) */
  unitCount: number
  /** parsed count equals the receipt's own count (by lines or by units) */
  countMatches: boolean
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

/**
 * Date from "Slot time: Tuesday 27th January 2026, 9:00am - 10:00am". UTC midnight, so it does not
 * depend on the server's time zone.
 */
export function parseReceiptDate(text: string): Date | null {
  const match = text.match(/Slot time:\s*\w+\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\w+)\s+(\d{4})/i)
  if (!match) return null
  const month = MONTHS.indexOf(match[2].toLowerCase())
  if (month < 0) return null
  return new Date(Date.UTC(Number(match[3]), month, Number(match[1])))
}

/** Order number from "Order number: 1234567890" (or "Order no."). */
export function parseOrderNumber(text: string): string | null {
  const match = text.match(/Order\s*(?:number|no\.?)\s*[:#]?\s*(\d{6,})/i)
  return match ? match[1] : null
}

const COUNT_HEADING = /(?:Groceries|Delivery summary)\s*\((\d+)\s*items?\)/i

/** A new product line starts with a quantity ("2", "0.334kg") followed by a capitalised name. */
const NEW_ITEM = /^(\d+(?:\.\d+)?)(kg)?\s*[A-Z]/

/** A variable weight at the end of the name, e.g. "Beef Mince 0.42kg" (always has a decimal point). */
const TRAILING_WEIGHT = /\s+\d*\.\d+\s*kg$/i

export function parseReceiptLines(text: string): { expectedCount: number | null; lines: ReceiptLine[] } {
  let expectedCount: number | null = null
  let inItems = false
  const section: string[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const heading = line.match(COUNT_HEADING)
    if (heading) {
      expectedCount = Number(heading[1])
      inItems = true
      continue
    }
    if (/^Order summary/i.test(line)) break
    if (inItems) section.push(line)
  }

  const joined: string[] = []
  for (const line of section) {
    if (NEW_ITEM.test(line)) joined.push(line)
    else if (joined.length > 0) joined[joined.length - 1] += ' ' + line
  }

  const lines: ReceiptLine[] = []
  for (const line of joined) {
    const m = line.match(/^(\d+(?:\.\d+)?)(kg)?\s*(.+?)\s*£[\d,.]+$/)
    if (!m) continue
    const name = m[3].replace(TRAILING_WEIGHT, '').replace(/\s+/g, ' ').trim()
    if (!name) continue
    const weighed = m[2] === 'kg' || m[1].includes('.')
    lines.push({ name, quantity: weighed ? 1 : Number(m[1]) })
  }
  return { expectedCount, lines }
}

export function parseReceiptText(text: string): ParsedReceipt {
  const { expectedCount, lines } = parseReceiptLines(text)
  const lineCount = lines.length
  const unitCount = lines.reduce((sum, l) => sum + l.quantity, 0)
  return {
    orderNumber: parseOrderNumber(text),
    purchaseDate: parseReceiptDate(text),
    expectedCount,
    lines,
    lineCount,
    unitCount,
    countMatches: expectedCount !== null && (expectedCount === lineCount || expectedCount === unitCount),
  }
}
