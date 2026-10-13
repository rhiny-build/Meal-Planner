/**
 * GET: the recipes the admin backfill page walks through, in order. No model calls.
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { listBackfillRecipes } from '@/lib/agents/recipeBackfill/adminSteps'

export const dynamic = 'force-dynamic'

export async function GET() {
  const recipes = await listBackfillRecipes(prisma)
  return NextResponse.json({ recipes })
}
