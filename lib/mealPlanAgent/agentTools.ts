/**
 * The agent's tools for the SDK tool runner: thin wrappers that give the plain functions in tools.ts a name, a
 * description and an input schema (zod, which the SDK turns into JSON schema and validates against).
 * Each call is also written to the run log, because the tool runner runs tools for us and does not report them.
 */

import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod/v4'
import type { PrismaClient } from '@prisma/client'
import type { RunHandle } from '@/lib/agents/runLog'
import { readDayNotes, readPlanDays, searchRecipeBook, setMealSlot } from './tools'
import { SLOTS, type PlanStore, type Slot } from './types'

const date = z.string().describe('A date like 2026-10-19')
const slot = z.enum(SLOTS as unknown as [Slot, ...Slot[]])

export interface SlotChange {
  date: string
  day: string
  slot: Slot
  was: string | null
  now: string | null
}

export interface PlanAgentToolkit {
  tools: ReturnType<typeof betaZodTool<any>>[]
  /** Every successful slot change the agent made, in order (for "what changed") */
  changes: SlotChange[]
}

export function createPlanAgentTools(prisma: PrismaClient, store: PlanStore, run: RunHandle, today: string): PlanAgentToolkit {
  const changes: SlotChange[] = []

  /** Run a tool body, record the call and its result on the run, return the result as the JSON text Claude reads. */
  const recorded = (toolName: string, body: (input: any) => Promise<unknown>) => async (input: unknown) => {
    await run.step('tool_call', { input }, { toolName })
    let output: unknown
    try {
      output = await body(input)
    } catch (err) {
      output = { error: err instanceof Error ? err.message : 'Tool failed' }
    }
    await run.step('tool_result', { output }, { toolName })
    return JSON.stringify(output)
  }

  const tools = [
    betaZodTool({
      name: 'read_plan',
      description: 'Read the meal plan for a range of days (inclusive, at most 60 days): per day the lunch, protein, carb and vegetable recipes (id and name), the reason if it has one, and kept_as_chosen for slots Ronen filled himself. Empty slots are null.',
      inputSchema: z.object({ from: date, to: date }),
      run: recorded('read_plan', input => readPlanDays(prisma, store, input)),
    }),
    betaZodTool({
      name: 'read_day_notes',
      description: 'Read the notes Ronen wrote on days (e.g. "football till 7", "out") for a range of days (inclusive).',
      inputSchema: z.object({ from: date, to: date }),
      run: recorded('read_day_notes', input => readDayNotes(prisma, input)),
    }),
    betaZodTool({
      name: 'search_recipes',
      description: 'Search the recipe book. Filter by slot (which slot the recipe can fill), kind (full or quick), tier (favorite, non-regular, new) and words in the name. Each result has its id, kind, tier, type and daysSinceOnPlan (absent = never planned). Results are ordered longest-since-planned first, 12 by default. Use notOnPlanInLastDays to leave out recent repeats.',
      inputSchema: z.object({
        slot: slot.optional(),
        kind: z.enum(['full', 'quick']).optional(),
        tier: z.enum(['favorite', 'non-regular', 'new']).optional(),
        query: z.string().optional().describe('Words that must appear in the recipe name, e.g. "fish" or "salmon"'),
        notOnPlanInLastDays: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(30).optional(),
      }),
      run: recorded('search_recipes', input => searchRecipeBook(prisma, input, today)),
    }),
    betaZodTool({
      name: 'set_meal_slot',
      description: 'Set one slot of one day to a recipe (recipe_id from search_recipes), or clear it with recipe_id null. Optionally give a short reason for the day (shown to Ronen). Fails for slots Ronen chose himself.',
      inputSchema: z.object({
        date,
        slot,
        recipe_id: z.string().nullable(),
        reason: z.string().max(120).optional().describe('Under 10 words, why this day looks like this'),
      }),
      run: recorded('set_meal_slot', async input => {
        const result = await setMealSlot(prisma, store, input)
        if (result.ok && 'changed' in result) changes.push({ date: result.changed.date, day: result.changed.day, slot: result.changed.slot, was: result.changed.was, now: result.changed.now })
        return result
      }),
    }),
  ]

  return { tools, changes }
}
