import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const log = await prisma.agentClassificationLog.findUnique({ where: { id } })
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.agentClassificationLog.update({
    where: { id },
    data: { status: 'user_staple' },
  })

  if (log.suggestedItemId) {
    await prisma.rejectedSuggestion.upsert({
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
  }

  return NextResponse.json({ ok: true })
}
