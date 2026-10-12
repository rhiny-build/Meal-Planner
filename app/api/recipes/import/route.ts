/**
 * Recipe import API route
 *
 * POST { input: string }: input is a recipe URL or a free-text description.
 * Runs the recipe importer agent and returns the draft for review (nothing is saved).
 * Every run is recorded and can be inspected on /agent-runs/<runId>.
 */

import { NextRequest, NextResponse } from 'next/server'
import { classifyImportInput, runRecipeImporter } from '@/lib/agents/recipeImporter'

// An import takes a few model turns plus a page fetch.
export const maxDuration = 120

const MAX_INPUT_LENGTH = 8000

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const raw = typeof body?.input === 'string' ? body.input.trim() : ''
  if (!raw) {
    return NextResponse.json({ error: 'Enter a recipe URL or describe the recipe' }, { status: 400 })
  }
  if (raw.length > MAX_INPUT_LENGTH) {
    return NextResponse.json({ error: 'That is too long. Keep it under 8000 characters' }, { status: 400 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
  }

  const result = await runRecipeImporter(classifyImportInput(raw))
  if (!result.ok) {
    console.error('Recipe import failed:', result.error)
    return NextResponse.json(
      { error: 'The import did not finish. Try again, or add the recipe by hand.', runId: result.runId },
      { status: 502 }
    )
  }
  return NextResponse.json({ runId: result.runId, ...result.output })
}
