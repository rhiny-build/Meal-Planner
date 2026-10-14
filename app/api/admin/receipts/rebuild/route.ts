/**
 * Rebuild PurchaseHistory from the stored raw PDFs.
 * GET: the order numbers to re-parse. POST { orderNumbers } (at most 5): re-parse those. Each order's rows are
 * replaced in one transaction, so it is safe to run at any time and to stop half way.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { reparseStoredReceipt, type ReceiptReport } from '@/lib/receipts/ingest'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_ORDERS = 5

export async function GET() {
  const receipts = await prisma.receipt.findMany({ select: { orderNumber: true }, orderBy: { purchaseDate: 'asc' } })
  return NextResponse.json({ orderNumbers: receipts.map(r => r.orderNumber) })
}

export async function POST(request: Request) {
  const { orderNumbers } = (await request.json()) as { orderNumbers?: string[] }
  if (!Array.isArray(orderNumbers) || orderNumbers.length === 0 || orderNumbers.length > MAX_ORDERS) {
    return NextResponse.json({ error: `Send 1 to ${MAX_ORDERS} order numbers` }, { status: 400 })
  }
  const reports: ReceiptReport[] = []
  for (const orderNumber of orderNumbers) {
    if (!/^\d+$/.test(orderNumber)) {
      reports.push({ file: orderNumber, status: 'failed', error: 'Bad order number' })
      continue
    }
    reports.push(await reparseStoredReceipt(prisma, orderNumber))
  }
  return NextResponse.json({ reports })
}
