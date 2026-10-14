/**
 * The plan tools, as plain functions. Two callers use exactly these: the in-app agent (wrapped for the SDK tool
 * runner in agentTools.ts) and the MCP server, where Claude.ai is the agent (lib/mcp/tools/planTools.ts).
 * Each does one thing and returns JSON-able data, never a prose reply.
 */

import type { PrismaClient } from '@prisma/client'
import { formatDateParam, parseDateParam } from '@/lib/dateUtils'
import { addDays, validDateKey } from './dates'
import { searchRecipes, type RecipeSearchParams } from './recipeSearch'
import type { PlanDay, PlanStore, Slot } from './types'

const MAX_DAYS = 60

export interface RecipeNames {
  [id: string]: string
}

async function nameLookup(prisma: PrismaClient, days: PlanDay[]): Promise<RecipeNames> {
  const ids = [...new Set(days.flatMap(d => [d.lunch, d.protein, d.carb, d.vegetable]).filter((id): id is string => !!id))]
  const recipes = ids.length ? await prisma.recipe.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : []
  return Object.fromEntries(recipes.map(r => [r.id, r.name]))
}

/** What a tool shows for a day: names and ids per slot, never bare ids. */
export function describeDay(day: PlanDay, names: RecipeNames) {
  const slot = (id: string | null) => (id ? { id, name: names[id] ?? '(unknown recipe)' } : null)
  return {
    date: day.date, day: day.dayOfWeek,
    lunch: slot(day.lunch), protein: slot(day.protein), carb: slot(day.carb), vegetable: slot(day.vegetable),
    ...(day.reason ? { reason: day.reason } : {}),
    ...(day.locked.length ? { kept_as_chosen: day.locked } : {}),
  }
}

function checkRange(from: string, to: string): string | null {
  if (!validDateKey(from) || !validDateKey(to)) return 'from and to must be dates like 2026-10-19'
  if (to < from) return 'to must not be before from'
  if (addDays(from, MAX_DAYS - 1) < to) return `Ask for at most ${MAX_DAYS} days at a time`
  return null
}

export async function readPlanDays(prisma: PrismaClient, store: PlanStore, input: { from: string; to: string }) {
  const problem = checkRange(input.from, input.to)
  if (problem) return { error: problem }
  const days = await store.readDays(input.from, input.to)
  const names = await nameLookup(prisma, days)
  return { source: store.kind === 'draft' ? 'draft (not yet accepted)' : 'saved plan', days: days.map(d => describeDay(d, names)) }
}

export async function readDayNotes(prisma: PrismaClient, input: { from: string; to: string }) {
  const problem = checkRange(input.from, input.to)
  if (problem) return { error: problem }
  const rows = await prisma.dayNote.findMany({
    where: { date: { gte: new Date(`${input.from}T00:00:00.000Z`), lte: new Date(`${input.to}T00:00:00.000Z`) } },
    orderBy: { date: 'asc' },
  })
  return { notes: rows.map(r => ({ date: r.date.toISOString().slice(0, 10), note: r.text })) }
}

export async function searchRecipeBook(prisma: PrismaClient, input: RecipeSearchParams, today = formatDateParam(new Date())) {
  const hits = await searchRecipes(prisma, input, today)
  return { count: hits.length, recipes: hits }
}

export async function setMealSlot(
  prisma: PrismaClient,
  store: PlanStore,
  input: { date: string; slot: Slot; recipe_id: string | null; reason?: string }
) {
  const result = await store.setSlot(input.date, input.slot, input.recipe_id, input.reason)
  if (!result.ok) return { ok: false, error: result.error }
  const names = await nameLookup(prisma, [result.day])
  const warning = input.recipe_id ? await recentRepeatWarning(prisma, input.recipe_id, input.date, names[input.recipe_id]) : null
  return {
    ok: true,
    changed: { date: result.day.date, day: result.day.dayOfWeek, slot: input.slot, was: result.before, now: input.recipe_id },
    day: describeDay(result.day, names),
    ...(warning ? { warning } : {}),
  }
}

/** A soft hint (never a block): this recipe was on the saved plan in the 21 days before the day it was just put on. */
async function recentRepeatWarning(prisma: PrismaClient, recipeId: string, date: string, name = 'This recipe') {
  const since = addDays(date, -21)
  const rows = await prisma.mealPlan.findMany({
    where: {
      date: { gte: parseDateParam(since), lt: parseDateParam(date) },
      OR: [{ lunchRecipeId: recipeId }, { proteinRecipeId: recipeId }, { carbRecipeId: recipeId }, { vegetableRecipeId: recipeId }],
    },
    orderBy: { date: 'desc' },
    take: 1,
  })
  return rows.length ? `${name} was already on the plan on ${formatDateParam(rows[0].date)}. Pick something else if there is a good alternative.` : null
}
