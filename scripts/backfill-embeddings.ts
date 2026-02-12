/**
 * Backfill embeddings for all MasterListItems that have a baseIngredient but no embedding.
 *
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts --dry-run   # preview only, no DB writes
 *   npx tsx scripts/backfill-embeddings.ts              # compute embeddings and save
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { computeEmbeddings } from '../lib/ai/embeddings'

const BATCH_SIZE = 50
const DRY_RUN = process.argv.includes('--dry-run')

const prisma = new PrismaClient()

async function main() {
  if (DRY_RUN) {
    console.log('DRY RUN — no changes will be saved\n')
  }

  const items = await prisma.masterListItem.findMany({
    where: {
      baseIngredient: { not: null },
      embedding: { isEmpty: true },
    },
    select: { id: true, name: true, baseIngredient: true },
    orderBy: { name: 'asc' },
  })

  if (items.length === 0) {
    console.log('All items with baseIngredient already have embeddings. Nothing to do.')
    return
  }

  console.log(`Found ${items.length} items to embed\n`)

  let processed = 0
  const batches = Math.ceil(items.length / BATCH_SIZE)

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1

    console.log(`--- Batch ${batchNum}/${batches} (${batch.length} items) ---`)

    const texts = batch.map((item) => item.baseIngredient as string)
    const embeddings = await computeEmbeddings(texts)

    for (let j = 0; j < batch.length; j++) {
      console.log(`  "${batch[j].name}" (base: "${batch[j].baseIngredient}") → ${embeddings[j].length}-dim vector`)
    }

    if (!DRY_RUN) {
      for (let j = 0; j < batch.length; j++) {
        await prisma.masterListItem.update({
          where: { id: batch[j].id },
          data: { embedding: embeddings[j] },
        })
      }
      console.log(`  Saved ${batch.length} embeddings`)
    }

    processed += batch.length
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
