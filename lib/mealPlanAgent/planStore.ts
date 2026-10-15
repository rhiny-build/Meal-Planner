/**
 * The two places a week of meals lives: the saved plan (MealPlan rows) and a pending draft (PlanDraft).
 * The agent's tools and the MCP tools only ever talk to a PlanStore, so they do not care which one it is.
 */

import type { MealPlan, PrismaClient } from '@prisma/client'
import { formatDateParam, parseDateParam } from '@/lib/dateUtils'
import { daysBetween, dayName, getWeekStartDay, toDbDate, validDateKey, weekStartOf, addDays } from './dates'
import { emptyDay, SLOTS, type PlanDay, type PlanStore, type SetSlotResult, type Slot } from './types'
import { checkRecipeFitsSlot } from './slotFit'

const SLOT_COLUMN: Record<Slot, 'lunchRecipeId' | 'proteinRecipeId' | 'carbRecipeId' | 'vegetableRecipeId'> = {
  lunch: 'lunchRecipeId', protein: 'proteinRecipeId', carb: 'carbRecipeId', vegetable: 'vegetableRecipeId',
}

export function rowToDay(row: MealPlan): PlanDay {
  return {
    date: formatDateParam(row.date), dayOfWeek: row.dayOfWeek, reason: null, locked: [],
    lunch: row.lunchRecipeId, protein: row.proteinRecipeId, carb: row.carbRecipeId, vegetable: row.vegetableRecipeId,
  }
}

/** Mark the Shopping tab's saved list stale, as saving a plan through the Week page does. */
async function markShoppingListStale(prisma: PrismaClient, weekStart: string) {
  await prisma.shoppingList.updateMany({ where: { weekStart: parseDateParam(weekStart), stale: false }, data: { stale: true } })
}

/** Create the week's 7 day rows if the week has none yet (the Week page does the same on first view). */
export async function ensureWeekRows(prisma: PrismaClient, date: string): Promise<string> {
  const startDay = await getWeekStartDay(prisma)
  const weekStart = weekStartOf(date, startDay)
  const first = await prisma.mealPlan.findFirst({ where: { date: parseDateParam(weekStart) } })
  if (!first) {
    await prisma.mealPlan.createMany({
      data: Array.from({ length: 7 }, (_, i) => {
        const key = addDays(weekStart, i)
        return { date: parseDateParam(key), dayOfWeek: dayName(key) }
      }),
    })
  }
  return weekStart
}

export function createPlanStore(prisma: PrismaClient): PlanStore {
  return {
    kind: 'plan',

    async readDays(from, to) {
      const keys = daysBetween(from, to)
      if (keys.length === 0) return []
      const rows = await prisma.mealPlan.findMany({
        where: { date: { gte: parseDateParam(keys[0]), lt: parseDateParam(addDays(keys[keys.length - 1], 1)) } },
        orderBy: { date: 'asc' },
      })
      const byKey = new Map(rows.map(r => [formatDateParam(r.date), r]))
      return keys.map(key => (byKey.has(key) ? rowToDay(byKey.get(key)!) : emptyDay(key, dayName(key))))
    },

    async setSlot(date, slot, recipeId): Promise<SetSlotResult> {
      if (!validDateKey(date)) return { ok: false, error: `"${date}" is not a date (use YYYY-MM-DD)` }
      if (recipeId) {
        const problem = await checkRecipeFitsSlot(prisma, recipeId, slot)
        if (problem) return { ok: false, error: problem }
      }
      const weekStart = await ensureWeekRows(prisma, date)
      const row = await prisma.mealPlan.findFirst({ where: { date: parseDateParam(date) } })
      if (!row) return { ok: false, error: `No plan row for ${date}` }
      const updated = await prisma.mealPlan.update({ where: { id: row.id }, data: { [SLOT_COLUMN[slot]]: recipeId } })
      await markShoppingListStale(prisma, weekStart)
      return { ok: true, day: rowToDay(updated), before: row[SLOT_COLUMN[slot]] }
    },
  }
}

/** Parse the stored draft days defensively (it is JSON written by us, but old shapes should not crash a page). */
export function parseDraftDays(json: unknown): PlanDay[] {
  if (!Array.isArray(json)) return []
  return json.flatMap((d: Partial<PlanDay>) =>
    d && typeof d.date === 'string'
      ? [{
          date: d.date, dayOfWeek: d.dayOfWeek ?? dayName(d.date), reason: d.reason ?? null,
          lunch: d.lunch ?? null, protein: d.protein ?? null, carb: d.carb ?? null, vegetable: d.vegetable ?? null,
          locked: (d.locked ?? []).filter((s): s is Slot => (SLOTS as readonly string[]).includes(s)),
        }]
      : []
  )
}

export function createDraftStore(prisma: PrismaClient, weekStart: string): PlanStore {
  const load = async () => {
    const draft = await prisma.planDraft.findUnique({ where: { weekStart: toDbDate(weekStart) } })
    return draft ? parseDraftDays(draft.days) : null
  }
  const save = (days: PlanDay[]) =>
    prisma.planDraft.update({ where: { weekStart: toDbDate(weekStart) }, data: { days: days as unknown as object } })

  // The tool runner runs the model's tool calls at the same time, and each set_meal_slot reads the whole draft,
  // changes one slot and writes it back: without a queue, parallel calls overwrite each other's slots.
  let queue: Promise<unknown> = Promise.resolve()
  const inOrder = <T,>(work: () => Promise<T>): Promise<T> => {
    const result = queue.then(work)
    queue = result.catch(() => undefined)
    return result
  }

  return {
    kind: 'draft',

    // Days of the draft week come from the draft; any other day (recent weeks, for "what was cooked lately") from the saved plan
    async readDays(from, to) {
      const draftDays = new Map(((await load()) ?? []).map(d => [d.date, d]))
      const saved = await createPlanStore(prisma).readDays(from, to)
      return saved.map(day => draftDays.get(day.date) ?? day)
    },

    setSlot: (date, slot, recipeId, reason) => inOrder(async (): Promise<SetSlotResult> => {
      const days = await load()
      if (!days) return { ok: false, error: 'There is no draft for this week' }
      const day = days.find(d => d.date === date)
      if (!day) return { ok: false, error: `${date} is not in this draft week` }
      if (day.locked.includes(slot)) {
        return { ok: false, error: `Ronen already chose the ${slot} for ${day.dayOfWeek}; it is kept as it is` }
      }
      if (recipeId) {
        const problem = await checkRecipeFitsSlot(prisma, recipeId, slot)
        if (problem) return { ok: false, error: problem }
      }
      const before = day[slot]
      day[slot] = recipeId
      if (reason) day.reason = reason
      await save(days)
      return { ok: true, day, before }
    }),
  }
}
