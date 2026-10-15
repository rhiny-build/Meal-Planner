/**
 * POST /api/timing: a page-timing report from the browser (see components/TimingReporter.tsx).
 * Always answers 204 quickly; a bad report is ignored. Not itself measured.
 */

import { NextRequest, NextResponse } from 'next/server'
import { normaliseRoute } from '@/lib/timing/route'
import { saveTiming } from '@/lib/timing/saveTiming'

const MAX_MS = 10 * 60 * 1000

const asMs = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_MS ? Math.round(value) : null

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const totalMs = asMs(body?.totalMs)
    const kind = body?.kind === 'load' || body?.kind === 'nav' ? body.kind : null
    if (totalMs !== null && kind && typeof body.route === 'string') {
      await saveTiming({
        source: 'browser',
        kind,
        route: normaliseRoute(body.route),
        totalMs,
        ttfbMs: asMs(body.ttfbMs) ?? undefined,
      })
    }
  } catch {
    // not JSON: nothing to record
  }
  return new NextResponse(null, { status: 204 })
}
