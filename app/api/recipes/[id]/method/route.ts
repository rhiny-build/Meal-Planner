/**
 * POST { steps }: save a reviewed, captured method. Refuses (409) if the recipe already has steps.
 */

import { NextRequest, NextResponse } from 'next/server'
import { RecipeValidationError } from '@/lib/recipeWrite'
import { MethodAlreadyExistsError, saveCapturedMethod } from '@/lib/agents/methodCapture/saveMethod'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  if (!Array.isArray(body?.steps)) return NextResponse.json({ error: 'steps are required' }, { status: 400 })
  try {
    await saveCapturedMethod(id, body.steps)
    return NextResponse.json({ saved: true }, { status: 201 })
  } catch (error) {
    if (error instanceof MethodAlreadyExistsError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error instanceof RecipeValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Saving captured method failed:', error)
    return NextResponse.json({ error: 'Failed to save the method' }, { status: 500 })
  }
}
