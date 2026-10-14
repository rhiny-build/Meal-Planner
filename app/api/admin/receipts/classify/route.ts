/**
 * POST: classify the next batch of product names that have no item yet (cheap model, once per name).
 * The admin page calls it until `remaining` is 0. Returns the tokens used so the page can show the spend.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { claudeClassifier, classifyNewProducts, type TokenUsage } from '@/lib/nextWeek/classifyProducts'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  const usage: TokenUsage = { input: 0, output: 0 }
  try {
    const result = await classifyNewProducts(prisma, claudeClassifier(usage))
    return NextResponse.json({ ...result, usage })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Classification failed' }, { status: 502 })
  }
}
