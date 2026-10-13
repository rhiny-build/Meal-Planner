/**
 * Labels for the week list header: "12–18 October" and "This week".
 */

const DAY_MS = 24 * 60 * 60 * 1000

export function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const endLabel = weekEnd.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  if (weekStart.getMonth() === weekEnd.getMonth()) {
    return `${weekStart.getDate()}–${endLabel}`
  }
  const startLabel = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  return `${startLabel} – ${endLabel}`
}

/** "This week" for the current week, otherwise "Next week", "Last week" or "Week of 26 Oct". */
export function getWeekTitle(weekStart: Date, currentWeekStart: Date): string {
  const offsetWeeks = Math.round((weekStart.getTime() - currentWeekStart.getTime()) / (7 * DAY_MS))
  if (offsetWeeks === 0) return 'This week'
  if (offsetWeeks === 1) return 'Next week'
  if (offsetWeeks === -1) return 'Last week'
  return `Week of ${weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
}
