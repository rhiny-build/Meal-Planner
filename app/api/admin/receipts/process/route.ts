/**
 * POST { files: [{ path, name }] } (at most 5): parse the uploaded "incoming" PDFs, keep each raw PDF at
 * receipts/<orderNumber>.pdf, store the lines, then delete the incoming copy. One report per file.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ingestReceiptPdf, type ReceiptReport } from '@/lib/receipts/ingest'
import { deletePdf, getPdf, isIncomingPath } from '@/lib/receipts/storage'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MAX_FILES = 5

export async function POST(request: Request) {
  const { files } = (await request.json()) as { files?: { path: string; name: string }[] }
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES) {
    return NextResponse.json({ error: `Send 1 to ${MAX_FILES} files` }, { status: 400 })
  }
  const reports: ReceiptReport[] = []
  for (const file of files) {
    if (!isIncomingPath(file.path)) {
      reports.push({ file: file.name, status: 'failed', error: 'Bad path' })
      continue
    }
    const pdf = await getPdf(file.path)
    if (!pdf) {
      reports.push({ file: file.name, status: 'failed', error: 'Upload not found' })
      continue
    }
    const report = await ingestReceiptPdf(prisma, pdf, file.name)
    reports.push(report)
    // The permanent copy (if the receipt could be read) is already at receipts/<orderNumber>.pdf
    await deletePdf(file.path)
  }
  return NextResponse.json({ reports })
}
