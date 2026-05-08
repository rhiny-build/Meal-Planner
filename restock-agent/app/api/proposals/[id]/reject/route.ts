import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const log = await prisma.agentClassificationLog.findUnique({ where: { id } })
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const ops: Parameters<typeof prisma.$transaction>[0] = [
    prisma.agentClassificationLog.update({
      where: { id },
      data: { status: 'rejected' },
    }),
  ]

  // Write to RejectedSuggestion if there was a suggested item
  if (log.suggestedItemId) {
    ops.push(
      prisma.rejectedSuggestion.upsert({
        where: {
          normalisedName_masterItemId: {
            normalisedName: log.rawName.toLowerCase(),
            masterItemId: log.suggestedItemId,
          },
        },
        create: {
          normalisedName: log.rawName.toLowerCase(),
          masterItemId: log.suggestedItemId,
        },
        update: {},
      })
    )
  }

  await prisma.$transaction(ops)

  return NextResponse.json({ ok: true })
}
