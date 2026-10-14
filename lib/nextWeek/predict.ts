/**
 * Predict next week's order from past orders (pure logic, no database).
 * Port of docs/rehaul/mockups/prediction_reference.py, at item level, with the agreed rules:
 *  - usual weekly items: in >= 80% of the last 10 orders
 *  - maybe: in 70-79% of the last 10 orders, or a restock item (bought >= 8 times, steady rhythm,
 *    now 0.9-2x its usual gap since the last purchase)
 */

import { median, populationStdDev } from './stats'

export interface PurchaseLine {
  /** Order date, YYYY-MM-DD */
  date: string
  productName: string
  /** The item this product is a version of (already mapped) */
  item: string
}

export interface History {
  /** Distinct order dates, oldest first */
  orders: string[]
  /** item -> distinct order dates it was bought on, oldest first */
  dates: Map<string, string[]>
  /** item -> product name on its most recent order */
  lastProduct: Map<string, string>
  /** order date -> items in that order */
  baskets: Map<string, Set<string>>
}

export const WINDOW = 10
export const USUAL_SHARE = 0.8
export const MAYBE_SHARE = 0.7
export const MIN_ORDERS = 4
export const RESTOCK_MIN_BOUGHT = 8
export const RESTOCK_MAX_SPREAD = 0.6
export const RESTOCK_MIN_GAP_WEEKS = 1.5

export function buildHistory(lines: PurchaseLine[]): History {
  const baskets = new Map<string, Set<string>>()
  const lastProduct = new Map<string, string>()
  const lastProductDate = new Map<string, string>()
  for (const line of lines) {
    if (!baskets.has(line.date)) baskets.set(line.date, new Set())
    baskets.get(line.date)!.add(line.item)
    if (line.date >= (lastProductDate.get(line.item) ?? '')) {
      lastProductDate.set(line.item, line.date)
      lastProduct.set(line.item, line.productName)
    }
  }
  const orders = [...baskets.keys()].sort()
  const dates = new Map<string, string[]>()
  for (const order of orders) {
    for (const item of baskets.get(order)!) {
      if (!dates.has(item)) dates.set(item, [])
      dates.get(item)!.push(order)
    }
  }
  return { orders, dates, lastProduct, baskets }
}

export function weeksBetween(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / (7 * 24 * 3600 * 1000)
}

export interface Rhythm {
  /** Times bought (distinct orders) */
  bought: number
  lastDate: string
  /** Median weeks between purchases; null with fewer than 2 purchases */
  medianGap: number | null
  /** Spread of the gaps relative to the median (0 = perfectly steady) */
  spread: number | null
}

export function rhythm(dates: string[]): Rhythm {
  const gaps = dates.slice(1).map((d, i) => weeksBetween(dates[i], d))
  const med = gaps.length ? median(gaps) : null
  return {
    bought: dates.length,
    lastDate: dates[dates.length - 1],
    medianGap: med,
    spread: med && gaps.length >= 2 ? populationStdDev(gaps) / med : null,
  }
}

const roundWeeks = (weeks: number) => Math.max(1, Math.round(weeks))
const weeksLabel = (weeks: number) => (roundWeeks(weeks) === 1 ? '1 week' : `${roundWeeks(weeks)} weeks`)

/** "Usually every 2 weeks, last bought 4 weeks ago" */
export function restockReason(medianGap: number, since: number): string {
  const every = roundWeeks(medianGap) === 1 ? 'week' : `${roundWeeks(medianGap)} weeks`
  return `Usually every ${every}, last bought ${weeksLabel(since)} ago`
}

export interface UsualItem {
  item: string
  lastProduct: string
}

export interface MaybeItem {
  item: string
  lastProduct: string
  reason: string
  kind: 'share' | 'restock'
}

export interface Prediction {
  usual: UsualItem[]
  maybe: MaybeItem[]
}

/**
 * Prediction for an order on `target` (YYYY-MM-DD), using only orders before it.
 * With fewer than MIN_ORDERS earlier orders there is nothing worth predicting.
 */
export function predict(history: History, target: string): Prediction {
  const past = history.orders.filter(o => o < target)
  if (past.length < MIN_ORDERS) return { usual: [], maybe: [] }
  const window = past.slice(-WINDOW)

  const usual: UsualItem[] = []
  const maybe: MaybeItem[] = []
  for (const [item, allDates] of history.dates) {
    const dates = allDates.filter(d => d < target)
    if (dates.length === 0) continue
    const inWindow = window.filter(o => history.baskets.get(o)!.has(item)).length
    const share = inWindow / window.length
    const lastProduct = history.lastProduct.get(item) ?? item

    if (share >= USUAL_SHARE) {
      usual.push({ item, lastProduct })
      continue
    }
    if (share >= MAYBE_SHARE) {
      maybe.push({ item, lastProduct, kind: 'share', reason: `In ${inWindow} of your last ${window.length} orders` })
      continue
    }
    const r = rhythm(dates)
    if (r.bought < RESTOCK_MIN_BOUGHT || r.medianGap === null || r.spread === null) continue
    if (r.medianGap < RESTOCK_MIN_GAP_WEEKS || r.spread > RESTOCK_MAX_SPREAD) continue
    const since = weeksBetween(r.lastDate, target)
    if (since >= 0.9 * r.medianGap && since <= 2 * r.medianGap) {
      maybe.push({ item, lastProduct, kind: 'restock', reason: restockReason(r.medianGap, since) })
    }
  }
  usual.sort((a, b) => a.item.localeCompare(b.item))
  maybe.sort((a, b) => a.item.localeCompare(b.item))
  return { usual, maybe }
}
