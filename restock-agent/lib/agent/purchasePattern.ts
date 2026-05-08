export type Cadence = 'staple' | 'restock' | 'watching'

export interface PurchasePattern {
  cadence: Cadence
  purchaseCount: number
  avgIntervalDays: number | null
  weeksPresent: number
  totalWeeks: number
  reasoning: string
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
  let avgIntervalDays: number | null = null
  if (sorted.length >= 2) {
    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      intervals.push((sorted[i].getTime() - sorted[i - 1].getTime()) / 86400000)
    }
    avgIntervalDays = intervals.reduce((s, v) => s + v, 0) / intervals.length
  }

  if (weekFraction >= stapleThreshold) {
    return {
      cadence: 'staple',
      purchaseCount: count,
      avgIntervalDays,
      weeksPresent,
      totalWeeks,
      reasoning: `Present in ${weeksPresent}/${totalWeeks} weeks (${Math.round(weekFraction * 100)}%) — classified as staple`,
    }
  }

  if (count >= restockMinCount && weekFraction >= watchingThreshold) {
    return {
      cadence: 'restock',
      purchaseCount: count,
      avgIntervalDays,
      weeksPresent,
      totalWeeks,
      reasoning: `Purchased ${count} times across ${weeksPresent} weeks (${Math.round(weekFraction * 100)}% of weeks)${avgIntervalDays ? `, avg interval ${Math.round(avgIntervalDays)} days` : ''}`,
    }
  }

  return {
    cadence: 'watching',
    purchaseCount: count,
    avgIntervalDays,
    weeksPresent,
    totalWeeks,
    reasoning: `Only ${count} purchase(s) in ${weeksPresent} weeks — insufficient pattern to classify`,
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
