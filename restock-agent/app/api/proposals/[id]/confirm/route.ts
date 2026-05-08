import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const log = await prisma.agentClassificationLog.findUnique({ where: { id } })
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!log.suggestedItemId) {
    return NextResponse.json({ error: 'No suggested item to confirm' }, { status: 400 })
  }

  await prisma.$transaction([
    prisma.purchaseHistory.updateMany({
      where: { rawName: log.rawName, masterItemId: null },
      data: { masterItemId: log.suggestedItemId },
    }),
    prisma.agentClassificationLog.update({
      where: { id },
      data: { status: 'confirmed' },
    }),
  ])

  return NextResponse.json({ ok: true })
}
