/**
 * Timing summary for the admin page: per page (or route), how many requests,
 * the median, and the slowest 10% (the 90th percentile: nine in ten requests
 * were faster than this). Pure functions over rows read from RequestTiming.
 */

export type TimingRow = {
  source: string
  kind: string
  route: string
  totalMs: number
  dbMs: number | null
  queryCount: number | null
  coldStart: boolean
  ttfbMs: number | null
}

export type TimingSummary = {
  source: string
  kind: string
  route: string
  count: number
  medianMs: number
  slowestTenthMs: number
  medianDbMs: number | null
  medianQueries: number | null
  medianTtfbMs: number | null
  coldStarts: number
}

/** Nearest-rank percentile of a list (p between 0 and 100). Null for an empty list. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length))
  return sorted[rank - 1]
}

const present = (values: (number | null)[]): number[] => values.filter((value): value is number => value !== null)

export function summariseTimings(rows: TimingRow[]): TimingSummary[] {
  const groups = new Map<string, TimingRow[]>()
  for (const row of rows) {
    const key = `${row.source}|${row.route}`
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  return [...groups.values()]
    .map((group) => {
      const totals = group.map((row) => row.totalMs)
      return {
        source: group[0].source,
        kind: group[0].kind,
        route: group[0].route,
        count: group.length,
        medianMs: percentile(totals, 50)!,
        slowestTenthMs: percentile(totals, 90)!,
        medianDbMs: percentile(present(group.map((row) => row.dbMs)), 50),
        medianQueries: percentile(present(group.map((row) => row.queryCount)), 50),
        medianTtfbMs: percentile(present(group.map((row) => row.ttfbMs)), 50),
        coldStarts: group.filter((row) => row.coldStart).length,
      }
    })
    .sort((a, b) => b.slowestTenthMs - a.slowestTenthMs)
}
