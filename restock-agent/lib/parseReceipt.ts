/**
 * Parse the date from a Sainsbury's receipt header.
 * Looks for "Slot time: <day> <date>, <time>" pattern.
 * e.g. "Slot time: Tuesday 27th January 2026, 9:00am - 10:00am"
 */
export function parseDate(text: string): Date | null {
  const match = text.match(
    /Slot time:\s*\w+\s+(\d{1,2})(?:st|nd|rd|th)\s+(\w+)\s+(\d{4})/i
  )
  if (!match) return null
  const [, day, month, year] = match
  const dateStr = `${day} ${month} ${year}`
  const parsed = new Date(dateStr)
  if (isNaN(parsed.getTime())) return null
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

/**
 * Extract product names from receipt text.
 * Product lines start with a quantity (e.g. "1", "2", "0.334kg") and end with £price.
 * Long product names wrap across multiple lines — continuation lines don't start
 * with a quantity prefix but the last continuation ends with £price.
 * We first join wrapped lines, then parse each combined line.
 */
export function parseItems(text: string): string[] {
  const rawLines = text.split('\n')
  const items: string[] = []
  let inItemsSection = false

  const sectionLines: string[] = []
  for (const line of rawLines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (/(?:Groceries|Delivery summary)\s*\(\d+\s*items?\)/i.test(trimmed)) {
      inItemsSection = true
      continue
    }
    if (/^Order summary/i.test(trimmed)) break
    if (inItemsSection) sectionLines.push(trimmed)
  }

  const isNewItem = (line: string) =>
    /^(\d+(?:\.\d+)?(?:kg)?)\s*[A-Z]/.test(line)

  const joined: string[] = []
  for (const line of sectionLines) {
    if (isNewItem(line)) {
      joined.push(line)
    } else if (joined.length > 0) {
      joined[joined.length - 1] += ' ' + line
    }
  }

  for (const line of joined) {
    const m = line.match(/^(\d+(?:\.\d+)?(?:kg)?)\s*(.+?)£[\d.]+$/)
    if (m) {
      const productName = m[2].trim()
      if (productName) items.push(productName)
    }
  }

  return items
}
