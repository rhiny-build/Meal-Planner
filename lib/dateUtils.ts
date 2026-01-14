/**
 * Date Utility Functions
 *
 * Common date manipulation helpers for the meal planning app
 */

/**
 * Get the Monday of the week for a given date
 * @param date - The date to find the Monday for
 * @returns The Monday of that week (00:00:00)
 */
export const getMonday = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  return monday
}

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
 * Check if a date is a Monday
 * @param date - The date to check
 * @returns True if the date is a Monday
 */
export const isMonday = (date: Date): boolean => {
  return date.getDay() === 1
}
