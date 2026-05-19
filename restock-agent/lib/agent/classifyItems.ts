import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'
import { calculatePurchasePattern, distinctShoppingWeeks } from './purchasePattern'
import { findMatch } from './matchMasterItem'

export interface ClassificationResult {
  rawName: string
  suggestedItemId: string | null
  confidence: number
  reasoning: string
  status: 'pending' | 'watching' | 'skipped'
}

export async function classifyAllItems(
  prisma: PrismaClient,
  openai: OpenAI,
  runId: string
): Promise<{ processed: number; logged: number; skipped: number }> {
  // Fetch all PurchaseHistory with no masterItemId
  const unprocessedRows = await prisma.purchaseHistory.findMany({
    where: { masterItemId: null },
    select: { rawName: true, purchaseDate: true },
  })

  // Determine which rawNames already have a non-watching log
  const existingLogs = await prisma.agentClassificationLog.findMany({
    where: { status: { not: 'watching' } },
    select: { rawName: true },
  })
  const alreadyClassified = new Set(existingLogs.map((l) => l.rawName))

  // Group by rawName, excluding already-classified
  const byRawName = new Map<string, Date[]>()
  for (const row of unprocessedRows) {
    if (alreadyClassified.has(row.rawName)) continue
    const existing = byRawName.get(row.rawName) ?? []
    existing.push(row.purchaseDate)
    byRawName.set(row.rawName, existing)
  }

  if (byRawName.size === 0) {
    return { processed: 0, logged: 0, skipped: 0 }
  }

  // Total week span across ALL purchase history (not just unprocessed)
  const allDates = await prisma.purchaseHistory.findMany({
    select: { purchaseDate: true },
  })
  const weekSpan = distinctShoppingWeeks(allDates.map((r) => r.purchaseDate))

  // All rejections (negative signal)
  const rejections = await prisma.rejectedSuggestion.findMany({
    select: { normalisedName: true },
  })
  const rejectedNames = new Set(rejections.map((r) => r.normalisedName.toLowerCase()))

  // All restock MasterListItems for matching
  const masterItems = await prisma.masterListItem.findMany({
    select: { id: true, name: true, type: true, normalisedName: true },
  })

  let logged = 0
  let skipped = 0

  for (const [rawName, dates] of byRawName) {
    // Skip if in RejectedSuggestion
    if (rejectedNames.has(rawName.toLowerCase())) {
      skipped++
      continue
    }

    const pattern = calculatePurchasePattern(dates, weekSpan)

    if (pattern.cadence === 'staple') {
      skipped++
      console.log(`  [staple] ${rawName}`)
      continue
    }

    if (pattern.cadence === 'watching') {
      await upsertLog(prisma, {
        rawName,
        suggestedItemId: null,
        confidence: 0,
        reasoning: pattern.reasoning,
        status: 'watching',
        runId,
      })
      logged++
      console.log(`  [watching] ${rawName}`)
      continue
    }

    // Restock candidate — attempt matching
    const match = await findMatch(rawName, masterItems, prisma, openai)

    // If it matches a known staple in the master list, skip it
    if (match?.type === 'staple') {
      skipped++
      console.log(`  [staple] ${rawName} → ${match.name}`)
      continue
    }

    const reasoning = match
      ? `${pattern.reasoning}. Match: ${match.name} — ${match.reasoning}`
      : `${pattern.reasoning}. No matching MasterListItem found`

    const confidence = match ? match.confidence : 0.5

    await upsertLog(prisma, {
      rawName,
      suggestedItemId: match?.id ?? null,
      confidence,
      reasoning,
      status: 'pending',
      runId,
    })
    logged++
    console.log(
      `  [pending] ${rawName} → ${match?.name ?? 'no match'} (${Math.round(confidence * 100)}%)`
    )
  }

  return { processed: byRawName.size, logged, skipped }
}

async function upsertLog(
  prisma: PrismaClient,
  data: {
    rawName: string
    suggestedItemId: string | null
    confidence: number
    reasoning: string
    status: string
    runId: string
  }
) {
  // If a watching entry exists, update it; otherwise create a new one
  const existing = await prisma.agentClassificationLog.findFirst({
    where: { rawName: data.rawName, status: 'watching' },
  })

  if (existing) {
    await prisma.agentClassificationLog.update({
      where: { id: existing.id },
      data: {
        suggestedItemId: data.suggestedItemId,
        confidence: data.confidence,
        reasoning: data.reasoning,
        status: data.status,
        runId: data.runId,
      },
    })
  } else {
    await prisma.agentClassificationLog.create({ data })
  }
}
