/**
 * POST { notes: [{ at, text }] }: turn cooking notes into a draft method (nothing is saved).
 * The run is recorded on /agent-runs.
 */

import { NextRequest, NextResponse } from 'next/server'
import { parseCaptureNotes } from '@/lib/methodCapture/captureNotes'
import { CaptureNotAllowedError, runMethodCapture } from '@/lib/agents/methodCapture'

export const maxDuration = 60

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  const notes = parseCaptureNotes(body?.notes)
  if (!notes) return NextResponse.json({ error: 'Add at least one note first' }, { status: 400 })
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
  }
  try {
    const result = await runMethodCapture(id, notes)
    if (!result.ok) {
      const error = result.gaveUpReason
        ? `Could not make a method: ${result.gaveUpReason}`
        : 'That did not finish. Your notes are kept; try again.'
      return NextResponse.json({ error, runId: result.runId }, { status: 502 })
    }
    return NextResponse.json({ runId: result.runId, steps: result.output!.steps })
  } catch (error) {
    if (error instanceof CaptureNotAllowedError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('Method capture failed:', error)
    return NextResponse.json({ error: 'That did not finish. Your notes are kept; try again.' }, { status: 500 })
  }
}
