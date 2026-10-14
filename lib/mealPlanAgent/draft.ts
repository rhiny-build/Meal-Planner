/**
 * A draft week: made from the saved plan (filled slots are locked and kept), changed by the agent and by Ronen,
 * and only becoming the plan when accepted. Stored in PlanDraft (one row per week); see the log for why.
 */

import type { PrismaClient } from '@prisma/client'
import { parseDateParam } from '@/lib/dateUtils'
import { addDays, dayName, toDbDate } from './dates'
import { createPlanStore, ensureWeekRows, parseDraftDays } from './planStore'
import { SLOTS, type PlanDay, type Slot } from './types'

const filledSlots = (day: PlanDay): Slot[] => SLOTS.filter(slot => !!day[slot])

/** Start (or restart) the draft for a week from what is saved now. Whatever is filled stays and is locked. */
export async function createDraft(prisma: PrismaClient, weekStart: string): Promise<PlanDay[]> {
  const saved = await createPlanStore(prisma).readDays(weekStart, addDays(weekStart, 6))
  const days = saved.map(day => ({ ...day, reason: null, locked: filledSlots(day) }))
  await prisma.planDraft.upsert({
    where: { weekStart: toDbDate(weekStart) },
    create: { weekStart: toDbDate(weekStart), days: days as unknown as object },
    update: { days: days as unknown as object, summary: null },
  })
  return days
}

export async function getDraft(prisma: PrismaClient, weekStart: string): Promise<{ days: PlanDay[]; summary: string | null } | null> {
  const row = await prisma.planDraft.findUnique({ where: { weekStart: toDbDate(weekStart) } })
  return row ? { days: parseDraftDays(row.days), summary: row.summary } : null
}

export async function setDraftSummary(prisma: PrismaClient, weekStart: string, summary: string) {
  await prisma.planDraft.update({ where: { weekStart: toDbDate(weekStart) }, data: { summary } })
}

/**
 * Ronen's own changes to a draft day (swap, change). Reasons and locked slots come from the stored draft, except that
 * a day he changed loses its reason: the agent's reason was about a different meal.
 */
export async function saveDraftEdits(prisma: PrismaClient, weekStart: string, edited: PlanDay[]): Promise<void> {
  const current = await getDraft(prisma, weekStart)
  if (!current) return
  const byDate = new Map(edited.map(d => [d.date, d]))
  const days = current.days.map(day => {
    const next = byDate.get(day.date)
    if (!next) return day
    const changed = SLOTS.some(slot => (next[slot] ?? null) !== (day[slot] ?? null))
    return {
      ...day,
      lunch: next.lunch ?? null, protein: next.protein ?? null, carb: next.carb ?? null, vegetable: next.vegetable ?? null,
      reason: changed ? null : day.reason,
    }
  })
  await prisma.planDraft.update({ where: { weekStart: toDbDate(weekStart) }, data: { days: days as unknown as object } })
}

export async function discardDraft(prisma: PrismaClient, weekStart: string): Promise<void> {
  await prisma.planDraft.deleteMany({ where: { weekStart: toDbDate(weekStart) } })
}

/** Accept: the draft becomes the saved plan for its week (all seven days), and the draft is deleted. */
export async function acceptDraft(prisma: PrismaClient, weekStart: string): Promise<boolean> {
  const draft = await getDraft(prisma, weekStart)
  if (!draft) return false
  await ensureWeekRows(prisma, weekStart)
  await prisma.$transaction([
    ...draft.days.map(day =>
      prisma.mealPlan.updateMany({
        where: { date: parseDateParam(day.date) },
        data: { lunchRecipeId: day.lunch, proteinRecipeId: day.protein, carbRecipeId: day.carb, vegetableRecipeId: day.vegetable, dayOfWeek: day.dayOfWeek || dayName(day.date) },
      })
    ),
    prisma.shoppingList.updateMany({ where: { weekStart: parseDateParam(weekStart), stale: false }, data: { stale: true } }),
    prisma.planDraft.deleteMany({ where: { weekStart: toDbDate(weekStart) } }),
  ])
  return true
}
