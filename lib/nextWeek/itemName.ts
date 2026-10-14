/**
 * Cheap, deterministic item name for a product ("JS Whole Cucumber" -> "cucumber"). Used when the
 * cheap model has not classified a product yet, and as the fallback if it skips one.
 * Ported from the family() function in docs/rehaul/mockups/prediction_reference.py.
 */

const DROP =
  /\b(sainsbury'?s|js|taste the difference|so organic|fairtrade|british|fresh|loose|large|small|medium|whole|seedless|red|white|green|classic|ripe ?& ?ready|essential|organic|frozen|pack|each)\b/g

export function fallbackItemName(productName: string): string {
  let s = productName.toLowerCase()
  s = s.replace(/\(.*?\)/g, '')
  s = s.replace(DROP, '')
  s = s.replace(/\b\d+(\.\d+)?\s*(g|kg|ml|l|cl|pint|x|pk|pack)?\b/g, '')
  s = s.replace(/\bx\s*\d+\b/g, '')
  s = s.replace(/[^a-zà-ÿ& ]/g, ' ')
  return s.replace(/\s+/g, ' ').trim() || productName.toLowerCase().trim()
}
