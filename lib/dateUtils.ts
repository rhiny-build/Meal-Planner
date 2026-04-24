/**
 * Date Utility Functions
 *
 * Common date manipulation helpers for the meal planning app.
 * The `startDay` parameter uses JS Date.getDay() values: 0=Sunday, 1=Monday, ..., 6=Saturday.
 */

/**
 * Get the start of the week for a given date
 * @param date - The date to find the week start for
 * @param startDay - The day the week starts on (0=Sun, 1=Mon, ..., 6=Sat). Defaults to 1 (Monday).
 * @returns The week start date (00:00:00)
 */
export const getWeekStart = (date: Date, startDay: number = 1): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day - startDay + 7) % 7
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/** @deprecated Use getWeekStart instead */
export const getMonday = (date: Date): Date => getWeekStart(date, 1)

/**
 * Format a date for display (e.g., "Jan 15")
 * @param date - The date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Check if a date falls on the configured week start day
 * @param date - The date to check
 * @param startDay - The expected start day (0=Sun, 1=Mon, ..., 6=Sat). Defaults to 1 (Monday).
 * @returns True if the date matches the start day
 */
export const isWeekStartDay = (date: Date, startDay: number = 1): boolean => {
  return date.getDay() === startDay
}

/** @deprecated Use isWeekStartDay instead */
export const isMonday = (date: Date): boolean => isWeekStartDay(date, 1)

/**
 * Check if a week has passed (current date is on or after the following week's start)
 */
export const isWeekPast = (weekStart: Date, startDay: number = 1): boolean => {
  const nextWeekStart = new Date(weekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  nextWeekStart.setHours(0, 0, 0, 0)

  const today = getWeekStart(new Date(), startDay)
  today.setHours(0, 0, 0, 0)

  return today >= nextWeekStart
}
