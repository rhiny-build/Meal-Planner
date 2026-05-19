export type Cadence = 'staple' | 'restock' | 'watching'

export interface PurchasePattern {
  cadence: Cadence
  purchaseCount: number
  medianIntervalDays: number | null
  weeksPresent: number
  totalWeeks: number
  reasoning: string
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * How many distinct ISO weeks appear in a set of dates.
 */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${week}`
}

export function calculatePurchasePattern(
  purchaseDates: Date[],
  totalWeeks: number
): PurchasePattern {
  const count = purchaseDates.length

  const weeks = new Set(purchaseDates.map(isoWeekKey))
  const weeksPresent = weeks.size

  const stapleThreshold = 0.6
  const restockMinCount = 3
  const watchingThreshold = 0.2

  const weekFraction = totalWeeks > 0 ? weeksPresent / totalWeeks : 0

  // Sort dates ascending to calculate inter-purchase intervals
  const sorted = [...purchaseDates].sort((a, b) => a.getTime() - b.getTime())
  let medianIntervalDays: number | null = null
  if (sorted.length >= 2) {
    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((sorted[i].getTime() - sorted[i - 1].getTime()) / 86400000)
    }
    medianIntervalDays = medianOf(intervals)
  }

  const pct = Math.round(weekFraction * 100)

  if (weekFraction >= stapleThreshold) {
    return {
      cadence: 'staple',
      purchaseCount: count,
      medianIntervalDays,
      weeksPresent,
      totalWeeks,
      reasoning: `Bought in ${weeksPresent} of ${totalWeeks} shopping trips (${pct}%) — classified as staple`,
    }
  }

  if (count >= restockMinCount && weekFraction >= watchingThreshold) {
    return {
      cadence: 'restock',
      purchaseCount: count,
      medianIntervalDays,
      weeksPresent,
      totalWeeks,
      reasoning: `Bought in ${weeksPresent} of ${totalWeeks} shopping trips (${pct}%)${medianIntervalDays ? ` — typically every ${Math.round(medianIntervalDays)} days` : ''}`,
    }
  }

  return {
    cadence: 'watching',
    purchaseCount: count,
    medianIntervalDays,
    weeksPresent,
    totalWeeks,
    reasoning: `Bought in ${weeksPresent} of ${totalWeeks} shopping trips — not enough purchases to classify (need 3+)`,
  }
}

/**
 * Return the number of distinct ISO shopping weeks across all purchase history.
 * Using distinct weeks (not a time range) correctly handles gaps between batches of receipts.
 */
export function distinctShoppingWeeks(allDates: Date[]): number {
  if (allDates.length === 0) return 0
  return new Set(allDates.map(isoWeekKey)).size
}
