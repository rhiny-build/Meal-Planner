/**
 * Backfill canonicalName for all MasterListItems and re-embed using canonicalName.
 *
 * Uses the LLM normalisation prompt to convert product names to canonical form
 * (e.g. "Sainsbury's Chopped Tomatoes 400g" → "tomatoes (tinned)").
 * Then recomputes embeddings using canonicalName as the text.
 *
 * Idempotent: skips items that already have canonicalName set.
 *
 * Usage:
 *   npx tsx scripts/backfill-canonical-names.ts --dry-run   # preview only
 *   npx tsx scripts/backfill-canonical-names.ts              # normalise, embed, and save
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { normaliseIngredients } from '../lib/ai/normaliseIngredients'
import { computeEmbeddings } from '../lib/ai/embeddings'

const BATCH_SIZE = 20
const DRY_RUN = process.argv.includes('--dry-run')

const prisma = new PrismaClient()

async function main() {
  if (DRY_RUN) {
    console.log('DRY RUN — no changes will be saved\n')
  }

  // Find items without canonicalName (idempotent query)
  const items = await prisma.$queryRaw<
    { id: string; name: string; baseIngredient: string | null }[]
  >`
    SELECT id, name, "baseIngredient"
    FROM "MasterListItem"
    WHERE "canonicalName" IS NULL
    ORDER BY name ASC
  `

  if (items.length === 0) {
    console.log('All items already have canonicalName set. Nothing to do.')
    return
  }

  console.log(`Found ${items.length} items to process\n`)

  let processed = 0
  let errors = 0
  const batches = Math.ceil(items.length / BATCH_SIZE)

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1

    console.log(`--- Batch ${batchNum}/${batches} (${batch.length} items) ---`)

    try {
      // Step 1: Get canonicalName from LLM normalisation
      const normResults = await normaliseIngredients(
        batch.map((item) => ({ id: item.id, name: item.name }))
      )

      // Step 2: Extract canonicalNames for embedding
      const canonicalNames: string[] = []
      const validItems: Array<{ id: string; name: string; baseIngredient: string; canonicalName: string }> = []

      for (const item of batch) {
        const result = normResults.find((r) => r.id === item.id)
        if (result) {
          const canonicalName = result.canonicalName ?? result.baseIngredient
          const baseIngredient = result.baseIngredient
          canonicalNames.push(canonicalName)
          validItems.push({ id: item.id, name: item.name, baseIngredient, canonicalName })
          console.log(`  "${item.name}" → canonical: "${canonicalName}" (base: "${baseIngredient}")`)
        } else {
          console.log(`  ⚠ "${item.name}" — no normalisation result (skipping)`)
          errors++
        }
      }

      if (validItems.length === 0) {
        console.log('  No valid items in this batch\n')
        continue
      }

      // Step 3: Compute embeddings from canonicalName
      const embeddings = await computeEmbeddings(canonicalNames)

      // Step 4: Write to DB
      if (!DRY_RUN) {
        for (let j = 0; j < validItems.length; j++) {
          await prisma.masterListItem.update({
            where: { id: validItems[j].id },
            data: {
              baseIngredient: validItems[j].baseIngredient,
              canonicalName: validItems[j].canonicalName,
              embedding: embeddings[j],
            },
          })
        }
        console.log(`  Saved ${validItems.length} items`)
      }

      processed += validItems.length
    } catch (error) {
      console.error(`  Batch ${batchNum} failed:`, error)
      errors += batch.length
    }

    console.log()
  }

  console.log(
    `Done. Processed ${processed} items, ${errors} errors (${batches} batch${batches > 1 ? 'es' : ''})${DRY_RUN ? ' [dry run]' : ''}`
  )
}

main()
  .catch((err) => {
    console.error('Backfill failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
