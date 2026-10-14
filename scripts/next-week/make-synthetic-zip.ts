/**
 * Writes a synthetic receipts zip (56 PDFs + 56 .eml files, like Ronen's first upload) for trying the admin upload.
 * Usage: npx tsx scripts/next-week/make-synthetic-zip.ts <output-dir>   (then zip the folder's files)
 */
import { mkdirSync, writeFileSync } from 'fs'
import { orderPdf, syntheticOrders } from '../../tests/fixtures/receipts/synthetic'

async function main() {
  const dir = process.argv[2]
  if (!dir) throw new Error('Usage: make-synthetic-zip.ts <output-dir>')
  mkdirSync(dir, { recursive: true })
  for (const o of syntheticOrders(56)) {
    writeFileSync(`${dir}/Order-${o.orderNumber}.pdf`, await orderPdf(o))
    writeFileSync(`${dir}/Order-${o.orderNumber}.eml`, 'From: orders\nSubject: Your order\n\nBody')
  }
}
main()
