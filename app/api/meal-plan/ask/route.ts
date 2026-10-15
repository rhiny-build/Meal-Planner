/**
 * POST { instruction, weekStart }: the Ask box on the Week page ("swap Wednesday for fish").
 * Runs the meal-plan agent on the saved plan, or on the week's draft when one is waiting to be accepted.
 * Replaces the old /api/meal-plan/modify, which returned a whole new plan without saying why.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatDateParam } from '@/lib/dateUtils'
import { getDraft } from '@/lib/mealPlanAgent/draft'
import { validDateKey } from '@/lib/mealPlanAgent/dates'
import { createDraftStore, createPlanStore } from '@/lib/mealPlanAgent/planStore'
import { runPlanAgent } from '@/lib/mealPlanAgent/runPlanAgent'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  const { instruction, weekStart } = (await request.json()) as { instruction?: string; weekStart?: string }
  if (!instruction?.trim() || instruction.length > 500 || !weekStart || !validDateKey(weekStart)) {
    return NextResponse.json({ error: 'Send an instruction and the week start (YYYY-MM-DD)' }, { status: 400 })
  }
  const hasDraft = (await getDraft(prisma, weekStart)) !== null
  const result = await runPlanAgent({
    mode: 'ask',
    instruction: instruction.trim(),
    prisma,
    store: hasDraft ? createDraftStore(prisma, weekStart) : createPlanStore(prisma),
    today: formatDateParam(new Date()),
    weekStart,
  })
  if (!result.ok) return NextResponse.json({ error: 'That did not work, please try again.', runId: result.runId }, { status: 502 })
  return NextResponse.json({ message: result.message, changes: result.changes, runId: result.runId, onDraft: hasDraft })
}
