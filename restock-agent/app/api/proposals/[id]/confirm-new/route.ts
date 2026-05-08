import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const log = await prisma.agentClassificationLog.findUnique({ where: { id } })
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Find the first category to assign (user can reassign later in main app)
  const defaultCategory = await prisma.category.findFirst({ orderBy: { order: 'asc' } })
  if (!defaultCategory) {
    return NextResponse.json({ error: 'No categories exist — seed the main app first' }, { status: 400 })
  }

  const maxOrder = await prisma.masterListItem.aggregate({ _max: { order: true } })
  const newOrder = (maxOrder._max.order ?? 0) + 1

  const newItem = await prisma.masterListItem.create({
    data: {
      name: log.rawName,
      normalisedName: log.rawName.toLowerCase(),
      type: 'restock',
      categoryId: defaultCategory.id,
      order: newOrder,
      embedding: [],
    },
  })

  await prisma.$transaction([
    prisma.purchaseHistory.updateMany({
      where: { rawName: log.rawName, masterItemId: null },
      data: { masterItemId: newItem.id },
    }),
    prisma.agentClassificationLog.update({
      where: { id },
      data: { status: 'confirmed', suggestedItemId: newItem.id },
    }),
  ])

  return NextResponse.json({ ok: true, newItemId: newItem.id })
}
