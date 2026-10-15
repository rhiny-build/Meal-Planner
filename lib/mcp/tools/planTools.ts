/**
 * Meal-plan tools for Claude.ai over MCP. Claude.ai is the agent here, so these are plain data tools (no in-app
 * agent runs, no API cost) that share their functions with the in-app agent's tools (lib/mealPlanAgent/tools.ts).
 * Writes go straight to the saved plan; the connector has no login (accepted for now, auth is its own piece of work).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getWeekStartDay, toDbDate, validDateKey, weekStartOf } from '@/lib/mealPlanAgent/dates'
import { createPlanStore } from '@/lib/mealPlanAgent/planStore'
import { readDayNotes, readPlanDays, searchRecipeBook, setMealSlot } from '@/lib/mealPlanAgent/tools'
import { SLOTS, type Slot } from '@/lib/mealPlanAgent/types'
import { jsonResult } from '../recipeInput'

const slotEnum = z.enum(SLOTS as unknown as [Slot, ...Slot[]])
const dateArg = z.string().describe('A date like "2026-10-19"')

export async function getPlanDaysHandler(input: { from: string; to: string }) {
  return jsonResult(await readPlanDays(prisma, createPlanStore(prisma), input))
}

export async function getDayNotesHandler(input: { from: string; to: string }) {
  return jsonResult(await readDayNotes(prisma, input))
}

export async function setDayNoteHandler({ date, note }: { date: string; note: string }) {
  if (!validDateKey(date)) return jsonResult({ ok: false, error: `"${date}" is not a date (use YYYY-MM-DD)` })
  const stored = toDbDate(date)
  if (!note.trim()) await prisma.dayNote.deleteMany({ where: { date: stored } })
  else await prisma.dayNote.upsert({ where: { date: stored }, create: { date: stored, text: note }, update: { text: note } })
  return jsonResult({ ok: true, date, note: note.trim() || null })
}

export async function searchRecipesHandler(input: Parameters<typeof searchRecipeBook>[1]) {
  return jsonResult(await searchRecipeBook(prisma, input))
}

export async function setMealSlotHandler(input: { date: string; slot: Slot; recipe_id: string | null }) {
  const result = await setMealSlot(prisma, createPlanStore(prisma), input)
  if (!result.ok || !validDateKey(input.date)) return jsonResult(result)
  // A week waiting to be accepted in the app would replace this change when accepted
  const weekStart = weekStartOf(input.date, await getWeekStartDay(prisma))
  const pending = await prisma.planDraft.findUnique({ where: { weekStart: toDbDate(weekStart) } })
  return jsonResult(
    pending
      ? { ...result, warning: `The week of ${weekStart} has a draft waiting in the app. Accepting that draft will replace this change.` }
      : result
  )
}

export function registerPlanTools(server: McpServer) {
  server.registerTool(
    'get_plan_days',
    {
      description:
        'Reads the saved meal plan for a range of days (inclusive, at most 60): per day the lunch, protein, carb and vegetable recipes (id and name). Empty slots are null. Use it to see what is planned, and what was cooked in recent weeks. Read-only.',
      inputSchema: { from: dateArg, to: dateArg },
    },
    async input => getPlanDaysHandler(input)
  )

  server.registerTool(
    'get_day_notes',
    {
      description: 'Reads the notes the user wrote on days (e.g. "football till 7", "out") for a range of days (inclusive). Read-only.',
      inputSchema: { from: dateArg, to: dateArg },
    },
    async input => getDayNotesHandler(input)
  )

  server.registerTool(
    'set_day_note',
    {
      description: 'Writes (or, with an empty note, clears) the note on one day, e.g. "football till 7". Applies straight away.',
      inputSchema: { date: dateArg, note: z.string().max(300).describe('The note text; empty clears it') },
    },
    async input => setDayNoteHandler(input)
  )

  server.registerTool(
    'search_recipes',
    {
      description:
        'Searches the recipe book for plan candidates. Filter by slot (which slot the recipe can fill: lunch, protein, carb, vegetable), kind (full or quick), tier (favorite, non-regular, new) and words in the name. Each result has its recipe id, kind, tier, type and daysSinceOnPlan (absent = never planned). Ordered longest-since-planned first. Use notOnPlanInLastDays to avoid recent repeats. Read-only.',
      inputSchema: {
        slot: slotEnum.optional(),
        kind: z.enum(['full', 'quick']).optional(),
        tier: z.enum(['favorite', 'non-regular', 'new']).optional(),
        query: z.string().optional().describe('Words that must appear in the recipe name'),
        notOnPlanInLastDays: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(30).optional(),
      },
    },
    async input => searchRecipesHandler(input)
  )

  server.registerTool(
    'set_meal_slot',
    {
      description:
        'Sets one slot of one day in the saved meal plan to a recipe (recipe_id from search_recipes), or clears it with recipe_id null. Applies straight to the plan: there is no draft step. Dinner is protein + carb + vegetable; use one call per slot.',
      inputSchema: { date: dateArg, slot: slotEnum, recipe_id: z.string().nullable() },
    },
    async input => setMealSlotHandler(input)
  )
}
