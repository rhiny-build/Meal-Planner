/**
 * Draft my week.
 * GET ?startDate=YYYY-MM-DD: the pending draft for that week, or null.
 * POST: draft NEXT week (the same week the Shopping tab's Next week view is for) from day notes, tiers, kinds and
 * recent weeks. Days Ronen already filled are kept. The draft is stored, and is not the plan until accepted.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatDateParam } from '@/lib/dateUtils'
import { createDraft, discardDraft, getDraft, setDraftSummary } from '@/lib/mealPlanAgent/draft'
import { validDateKey, getWeekStartDay } from '@/lib/mealPlanAgent/dates'
import { createDraftStore } from '@/lib/mealPlanAgent/planStore'
import { runPlanAgent } from '@/lib/mealPlanAgent/runPlanAgent'
import { nextWeekStart } from '@/lib/nextWeek/loadNextWeek'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const startDate = new URL(request.url).searchParams.get('startDate') ?? ''
  if (!validDateKey(startDate)) return NextResponse.json({ error: 'startDate must be YYYY-MM-DD' }, { status: 400 })
  return NextResponse.json({ draft: await getDraft(prisma, startDate) })
}

export async function POST() {
  const now = new Date()
  const weekStart = formatDateParam(nextWeekStart(now, await getWeekStartDay(prisma)))
  await createDraft(prisma, weekStart)
  const result = await runPlanAgent({
    mode: 'draft',
    prisma,
    store: createDraftStore(prisma, weekStart),
    today: formatDateParam(now),
    weekStart,
  })
  if (!result.ok) {
    await discardDraft(prisma, weekStart) // nothing counts as the plan, and a half-made draft is not worth keeping
    return NextResponse.json({ error: 'The draft did not work, please try again.', runId: result.runId }, { status: 502 })
  }
  await setDraftSummary(prisma, weekStart, result.message)
  return NextResponse.json({ weekStart, summary: result.message, changes: result.changes, runId: result.runId })
}
