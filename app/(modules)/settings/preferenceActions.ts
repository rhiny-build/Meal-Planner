'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const WEEK_START_DAY_KEY = 'weekStartDay'
const DEFAULT_WEEK_START_DAY = 1 // Monday
const SHOW_OLD_SHOPPING_LIST_KEY = 'showOldShoppingList'

/**
 * Get the configured week start day (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export async function getWeekStartDay(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: WEEK_START_DAY_KEY },
  })
  return setting ? parseInt(setting.value, 10) : DEFAULT_WEEK_START_DAY
}

/**
 * Set the week start day (0=Sunday, 1=Monday, ..., 6=Saturday)
 */
export async function setWeekStartDay(day: number): Promise<void> {
  if (day < 0 || day > 6 || !Number.isInteger(day)) {
    throw new Error('Week start day must be an integer between 0 and 6')
  }

  await prisma.systemSetting.upsert({
    where: { key: WEEK_START_DAY_KEY },
    update: { value: String(day) },
    create: { key: WEEK_START_DAY_KEY, value: String(day) },
  })

  revalidatePath('/settings')
  revalidatePath('/meal-plan')
  revalidatePath('/shopping-list')
}

/**
 * Whether the old shopping list (Meals / Staples / Restock / List tabs and the
 * master-list and category settings) is visible. Off by default.
 */
export async function getShowOldShoppingList(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: SHOW_OLD_SHOPPING_LIST_KEY },
  })
  return setting?.value === 'true'
}

export async function setShowOldShoppingList(show: boolean): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: SHOW_OLD_SHOPPING_LIST_KEY },
    update: { value: String(show) },
    create: { key: SHOW_OLD_SHOPPING_LIST_KEY, value: String(show) },
  })

  revalidatePath('/settings')
  revalidatePath('/shopping-list')
}
