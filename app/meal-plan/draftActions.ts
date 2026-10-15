'use server'

/** Server actions for a pending draft week: accept it, throw it away, or keep Ronen's own tweaks to it. */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { acceptDraft, discardDraft, saveDraftEdits } from '@/lib/mealPlanAgent/draft'
import { validDateKey } from '@/lib/mealPlanAgent/dates'
import type { PlanDay } from '@/lib/mealPlanAgent/types'

function checkedWeek(weekStart: string): string {
  if (!validDateKey(weekStart)) throw new Error('Bad week')
  return weekStart
}

export async function acceptDraftAction(weekStart: string): Promise<boolean> {
  const accepted = await acceptDraft(prisma, checkedWeek(weekStart))
  revalidatePath('/shopping-list')
  revalidatePath('/meal-plan')
  return accepted
}

export async function discardDraftAction(weekStart: string): Promise<void> {
  await discardDraft(prisma, checkedWeek(weekStart))
}

export async function saveDraftEditsAction(weekStart: string, days: PlanDay[]): Promise<void> {
  await saveDraftEdits(prisma, checkedWeek(weekStart), days)
}
