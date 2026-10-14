import type { ReceiptReport } from './ingest'

export interface UploadSummary {
  receipts: number
  newReceipts: number
  replacedReceipts: number
  items: number
  failed: ReceiptReport[]
  /** Receipts whose parsed count differs from the receipt's own "Groceries (N items)" */
  mismatches: ReceiptReport[]
}

export function summariseReports(reports: ReceiptReport[]): UploadSummary {
  const ok = reports.filter(r => r.status !== 'failed')
  return {
    receipts: ok.length,
    newReceipts: ok.filter(r => r.status === 'new').length,
    replacedReceipts: ok.filter(r => r.status === 'replaced').length,
    items: ok.reduce((sum, r) => sum + (r.lineCount ?? 0), 0),
    failed: reports.filter(r => r.status === 'failed'),
    mismatches: ok.filter(r => r.countMatches === false),
  }
}

export function describeMismatch(r: ReceiptReport): string {
  return `Order ${r.orderNumber}: receipt says ${r.expectedCount ?? 'no count'} items, parsed ${r.lineCount} lines (${r.unitCount} counting quantities)`
}
