/**
 * POST { entry }: apply ONE ticked report row (enrich, mark quick, or merge a duplicate).
 * Only fills empty fields and never replaces steps, so repeating a call changes nothing more.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyBackfillEntry } from '@/lib/agents/recipeBackfill/adminSteps'
import { isReportEntry } from '@/lib/agents/recipeBackfill/entryShape'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!isReportEntry(body?.entry)) return NextResponse.json({ error: 'A valid report entry is required' }, { status: 400 })

  const result = await applyBackfillEntry(prisma, body.entry)
  return NextResponse.json(result, { status: result.status === 'failed' ? 500 : 200 })
}
