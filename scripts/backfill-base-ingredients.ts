/**
 * Backfill baseIngredient for all MasterListItems that don't have one.
 *
 * Usage:
 *   npm run backfill:ingredients -- --dry-run   # preview only, no DB writes
 *   npm run backfill:ingredients                 # normalise and save
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { normaliseIngredients } from '../lib/ai/normaliseIngredients'

const BATCH_SIZE = 50
const DRY_RUN = process.argv.includes('--dry-run')

const prisma = new PrismaClient()

async function main() {
  if (DRY_RUN) {
    console.log('🔍 DRY RUN — no changes will be saved\n')
  }

  const items = await prisma.masterListItem.findMany({
    where: { baseIngredient: null },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  if (items.length === 0) {
    console.log('All items already have a baseIngredient. Nothing to do.')
    return
  }

  console.log(`Found ${items.length} items to normalise\n`)

  let processed = 0
  const batches = Math.ceil(items.length / BATCH_SIZE)

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1

    console.log(`--- Batch ${batchNum}/${batches} (${batch.length} items) ---`)

    const results = await normaliseIngredients(batch)

    for (const result of results) {
      const original = batch.find((b) => b.id === result.id)
      console.log(`  "${original?.name}" → "${result.baseIngredient}"`)
    }

    if (!DRY_RUN) {
      for (const result of results) {
        await prisma.masterListItem.update({
          where: { id: result.id },
          data: { baseIngredient: result.baseIngredient },
        })
      }
      console.log(`  ✓ Saved ${results.length} items`)
    }

    processed += results.length
    console.log()
  }

  console.log(
    `Done. Processed ${processed} items (${batches} batch${batches > 1 ? 'es' : ''})${DRY_RUN ? ' [dry run]' : ''}`
  )
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
