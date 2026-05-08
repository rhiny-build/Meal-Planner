import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import { calculatePurchasePattern, distinctShoppingWeeks } from '@/lib/agent/purchasePattern'
import { findMatch } from '@/lib/agent/matchMasterItem'

// Stream a plain-text log of the agent run back to the client.
export async function POST() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (line: string) =>
        controller.enqueue(encoder.encode(line + '\n'))

      const prisma = new PrismaClient()
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

      try {
        const runId = `run_${new Date().toISOString().replace(/[:.]/g, '-')}`
        send(`run:${runId}`)

        // Unprocessed items
        const unprocessedRows = await prisma.purchaseHistory.findMany({
          where: { masterItemId: null },
          select: { rawName: true, purchaseDate: true },
        })

        const existingLogs = await prisma.agentClassificationLog.findMany({
          where: { status: { not: 'watching' } },
          select: { rawName: true },
        })
        const alreadyClassified = new Set(existingLogs.map((l) => l.rawName))

        const byRawName = new Map<string, Date[]>()
        for (const row of unprocessedRows) {
          if (alreadyClassified.has(row.rawName)) continue
          const existing = byRawName.get(row.rawName) ?? []
          existing.push(row.purchaseDate)
          byRawName.set(row.rawName, existing)
        }

        if (byRawName.size === 0) {
          send('log:Nothing new to process.')
          send('done:0:0:0')
          return
        }

        send(`log:Found ${byRawName.size} unique item(s) to classify...`)

        const allDates = await prisma.purchaseHistory.findMany({ select: { purchaseDate: true } })
        const weekSpan = distinctShoppingWeeks(allDates.map((r) => r.purchaseDate))

        const rejections = await prisma.rejectedSuggestion.findMany({ select: { normalisedName: true } })
        const rejectedNames = new Set(rejections.map((r) => r.normalisedName.toLowerCase()))

        const masterItems = await prisma.masterListItem.findMany({
          select: { id: true, name: true, normalisedName: true },
        })

        let logged = 0, skipped = 0

        for (const [rawName, dates] of byRawName) {
          if (rejectedNames.has(rawName.toLowerCase())) { skipped++; continue }

          const pattern = calculatePurchasePattern(dates, weekSpan)

          if (pattern.cadence === 'staple') {
            skipped++
            send(`log:[staple] ${rawName}`)
            continue
          }

          if (pattern.cadence === 'watching') {
            await upsertLog(prisma, { rawName, suggestedItemId: null, confidence: 0, reasoning: pattern.reasoning, status: 'watching', runId })
            logged++
            send(`log:[watching] ${rawName}`)
            continue
          }

          const match = await findMatch(rawName, masterItems, prisma, openai)
          const reasoning = match
            ? `${pattern.reasoning}. Match: ${match.name} — ${match.reasoning}`
            : `${pattern.reasoning}. No matching MasterListItem found`

          await upsertLog(prisma, { rawName, suggestedItemId: match?.id ?? null, confidence: match?.confidence ?? 0.5, reasoning, status: 'pending', runId })
          logged++
          send(`log:[pending] ${rawName} → ${match?.name ?? 'no match'} (${Math.round((match?.confidence ?? 0.5) * 100)}%)`)
        }

        send(`done:${byRawName.size}:${logged}:${skipped}`)
      } catch (err) {
        send(`error:${err instanceof Error ? err.message : String(err)}`)
      } finally {
        await prisma.$disconnect()
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

async function upsertLog(
  prisma: PrismaClient,
  data: { rawName: string; suggestedItemId: string | null; confidence: number; reasoning: string; status: string; runId: string }
) {
  const existing = await prisma.agentClassificationLog.findFirst({
    where: { rawName: data.rawName, status: 'watching' },
  })
  if (existing) {
    await prisma.agentClassificationLog.update({ where: { id: existing.id }, data: { suggestedItemId: data.suggestedItemId, confidence: data.confidence, reasoning: data.reasoning, status: data.status, runId: data.runId } })
  } else {
    await prisma.agentClassificationLog.create({ data })
  }
}
