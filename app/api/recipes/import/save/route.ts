/**
 * POST { draft }: save a reviewed importer draft into the recipe book.
 */

import { NextRequest, NextResponse } from 'next/server'
import { saveRecipeDraft } from '@/lib/agents/recipeImporter/saveDraft'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.draft) {
    return NextResponse.json({ error: 'draft is required' }, { status: 400 })
  }
  try {
    const recipe = await saveRecipeDraft(body.draft)
    return NextResponse.json(recipe, { status: 201 })
  } catch (error) {
    // Validation messages from buildDraft are plain and user-fixable
    console.error('Error saving imported recipe:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save recipe' },
      { status: 400 }
    )
  }
}
