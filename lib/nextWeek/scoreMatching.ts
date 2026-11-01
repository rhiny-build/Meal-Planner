/**
 * Score an ingredient matcher against the real-case set (tests/fixtures/matching/cases.json).
 * Pure: give it the cases and a function from ingredient name to the answer ("none", an item, or "unsure").
 */

export interface MatchCase {
  name: string
  /** Expected item, or "none" (not bought) */
  expected: string
  /** Other answers that are just as right */
  alsoOk?: string[]
  /** More than one answer is defensible: left out of the score */
  unsure?: boolean
  /** One of the eight rows of the table in RUN-ingredient-matching.md: all must be right */
  tableRow?: boolean
}

export interface CaseSet {
  items: { item: string; aisle: string; bought: number }[]
  cases: MatchCase[]
}

export interface Miss {
  name: string
  expected: string
  got: string
  tableRow: boolean
}

export interface Score {
  tableRows: { right: number; total: number }
  rest: { right: number; total: number; percent: number }
  misses: Miss[]
  /** Answers that were "unsure" among the scored cases (they count as misses) */
  unsure: number
}

export const isRight = (c: MatchCase, got: string) => got === c.expected || (c.alsoOk ?? []).includes(got)

export function scoreCases(cases: MatchCase[], answer: (name: string) => string): Score {
  const misses: Miss[] = []
  const table = { right: 0, total: 0 }
  const rest = { right: 0, total: 0, percent: 0 }
  let unsure = 0
  for (const c of cases) {
    if (c.unsure) continue
    const got = answer(c.name)
    const ok = isRight(c, got)
    if (got === 'unsure') unsure++
    const bucket = c.tableRow ? table : rest
    bucket.total++
    if (ok) bucket.right++
    else misses.push({ name: c.name, expected: c.expected, got, tableRow: !!c.tableRow })
  }
  rest.percent = rest.total ? Math.round((1000 * rest.right) / rest.total) / 10 : 0
  return { tableRows: table, rest, misses, unsure }
}
