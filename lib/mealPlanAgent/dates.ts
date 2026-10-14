import type { PrismaClient } from '@prisma/client'
import { formatDateParam, getWeekStart, parseDateParam } from '@/lib/dateUtils'
import { getOrderedDays } from '@/lib/mealPlanHelpers'

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

/** A YYYY-MM-DD string that is a real calendar day, else null. */
export function validDateKey(value: string): string | null {
  if (!DATE_KEY.test(value)) return null
  const date = parseDateParam(value)
  return formatDateParam(date) === value ? value : null
}

export const addDays = (key: string, days: number): string => {
  const date = parseDateParam(key)
  date.setDate(date.getDate() + days)
  return formatDateParam(date)
}

/** Every day from `from` to `to` inclusive (at most 60, a guard against silly ranges). */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = []
  for (let key = from; key <= to && out.length < 60; key = addDays(key, 1)) out.push(key)
  return out
}

export const dayName = (key: string): string => getOrderedDays(0)[parseDateParam(key).getDay()]

/** The configured first day of the week (0 = Sunday), as Settings stores it. */
export async function getWeekStartDay(prisma: PrismaClient): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'weekStartDay' } })
  const parsed = setting ? parseInt(setting.value, 10) : 1
  return Number.isNaN(parsed) ? 1 : parsed
}

export const weekStartOf = (key: string, startDay: number): string =>
  formatDateParam(getWeekStart(parseDateParam(key), startDay))

/** A calendar day as the DATE column stores it (UTC midnight). */
export const toDbDate = (key: string): Date => new Date(`${key}T00:00:00.000Z`)
