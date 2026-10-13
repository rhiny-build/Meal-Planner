/**
 * POST { recipeId }: plan the backfill for ONE recipe (dry run: changes no recipe).
 * Returns the report row, the tokens it used, and an estimated cost. The admin page calls this once
 * per recipe because a single Vercel request cannot run for minutes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { planBackfillRecipe } from '@/lib/agents/recipeBackfill/adminSteps'

// One import takes 3 to 20 s. 60 s is the longest duration every Vercel plan accepts.
export const maxDuration = 60

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const recipeId = typeof body?.recipeId === 'string' ? body.recipeId : ''
  if (!recipeId) return NextResponse.json({ error: 'recipeId is required' }, { status: 400 })
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Anthropic API key not configured' }, { status: 500 })
  }

  const result = await planBackfillRecipe(prisma, recipeId)
  if (!result) return NextResponse.json({ error: 'That recipe no longer exists' }, { status: 404 })
  return NextResponse.json(result)
}
