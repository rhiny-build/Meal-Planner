/**
 * Turn one receipt PDF into stored data: raw PDF kept unchanged in storage, a Receipt row, and one
 * PurchaseHistory row per product line. Everything is keyed by order number, so uploading the same
 * receipt again (or rebuilding from the stored PDFs) replaces that order's rows and never duplicates.
 */

import type { PrismaClient } from '@prisma/client'
import { parseReceiptText, type ParsedReceipt } from './parseReceipt'
import { pdfToText } from './pdfText'
import { getPdf, putPdf, receiptPath } from './storage'

export const RECEIPT_SOURCE = 'receipt_upload'

export interface ReceiptReport {
  /** The file name or storage path this report is about */
  file: string
  status: 'new' | 'replaced' | 'failed'
  orderNumber?: string
  purchaseDate?: string
  lineCount?: number
  unitCount?: number
  expectedCount?: number | null
  countMatches?: boolean
  error?: string
}

/** Order number from the PDF text, else from a long number in the file name. */
export function resolveOrderNumber(parsed: ParsedReceipt, fileName: string): string | null {
  if (parsed.orderNumber) return parsed.orderNumber
  const fromName = fileName.match(/\d{6,}/)
  return fromName ? fromName[0] : null
}

/** Replace one order's rows with the parsed lines (all or nothing). Returns whether the order was already known. */
export async function saveParsedReceipt(
  prisma: PrismaClient,
  orderNumber: string,
  parsed: ParsedReceipt & { purchaseDate: Date }
): Promise<{ existed: boolean }> {
  const existed = (await prisma.receipt.count({ where: { orderNumber } })) > 0
  const receiptData = {
    purchaseDate: parsed.purchaseDate,
    blobPath: receiptPath(orderNumber),
    expectedCount: parsed.expectedCount,
    lineCount: parsed.lineCount,
    unitCount: parsed.unitCount,
    countMatches: parsed.countMatches,
  }
  await prisma.$transaction([
    prisma.purchaseHistory.deleteMany({ where: { orderNumber } }),
    prisma.purchaseHistory.createMany({
      data: parsed.lines.map((line, lineIndex) => ({
        rawName: line.name,
        purchaseDate: parsed.purchaseDate,
        source: RECEIPT_SOURCE,
        orderNumber,
        lineIndex,
      })),
    }),
    prisma.receipt.upsert({
      where: { orderNumber },
      create: { orderNumber, ...receiptData },
      update: receiptData,
    }),
  ])
  return { existed }
}

function reportFor(file: string, orderNumber: string, parsed: ParsedReceipt, existed: boolean): ReceiptReport {
  return {
    file,
    status: existed ? 'replaced' : 'new',
    orderNumber,
    purchaseDate: parsed.purchaseDate!.toISOString().slice(0, 10),
    lineCount: parsed.lineCount,
    unitCount: parsed.unitCount,
    expectedCount: parsed.expectedCount,
    countMatches: parsed.countMatches,
  }
}

/** New upload: parse, keep the raw PDF at receipts/<orderNumber>.pdf, store the lines. */
export async function ingestReceiptPdf(prisma: PrismaClient, pdf: Buffer, fileName: string): Promise<ReceiptReport> {
  try {
    const parsed = parseReceiptText(await pdfToText(pdf))
    const orderNumber = resolveOrderNumber(parsed, fileName)
    if (!orderNumber) return { file: fileName, status: 'failed', error: 'No order number found' }
    if (!parsed.purchaseDate) return { file: fileName, status: 'failed', orderNumber, error: 'No delivery date found' }
    if (parsed.lineCount === 0) return { file: fileName, status: 'failed', orderNumber, error: 'No product lines found' }

    await putPdf(receiptPath(orderNumber), pdf)
    const { existed } = await saveParsedReceipt(prisma, orderNumber, parsed as ParsedReceipt & { purchaseDate: Date })
    return reportFor(fileName, orderNumber, parsed, existed)
  } catch (err) {
    return { file: fileName, status: 'failed', error: err instanceof Error ? err.message : String(err) }
  }
}

/** Rebuild: re-parse one stored PDF and replace that order's rows. */
export async function reparseStoredReceipt(prisma: PrismaClient, orderNumber: string): Promise<ReceiptReport> {
  const file = receiptPath(orderNumber)
  try {
    const pdf = await getPdf(file)
    if (!pdf) return { file, status: 'failed', orderNumber, error: 'Stored PDF not found' }
    const parsed = parseReceiptText(await pdfToText(pdf))
    if (!parsed.purchaseDate) return { file, status: 'failed', orderNumber, error: 'No delivery date found' }
    if (parsed.lineCount === 0) return { file, status: 'failed', orderNumber, error: 'No product lines found' }
    const { existed } = await saveParsedReceipt(prisma, orderNumber, parsed as ParsedReceipt & { purchaseDate: Date })
    return reportFor(file, orderNumber, parsed, existed)
  } catch (err) {
    return { file, status: 'failed', orderNumber, error: err instanceof Error ? err.message : String(err) }
  }
}
