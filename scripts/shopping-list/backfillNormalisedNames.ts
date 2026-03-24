/**
 * Backfill normalisedName for all MasterListItems and re-embed.
 *
 * Uses the LLM normalisation prompt to convert product names to normalised form
 * (e.g. "Sainsbury's Chopped Tomatoes 400g" → "tomatoes (tinned)").
 * Then recomputes embeddings using normalisedName as the text.
 *
 * Idempotent: skips items that already have normalisedName set.
 *
 * Usage:
 *   npx tsx scripts/backfill-canonical-names.ts --dry-run   # preview only
 *   npx tsx scripts/backfill-canonical-names.ts              # normalise, embed, and save
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { normaliseMasterItems } from '../lib/shopping-list/normaliseMasterItem'
import { computeEmbeddings } from '../lib/shopping-list/ingredientEmbeddings'

const BATCH_SIZE = 20
const DRY_RUN = process.argv.includes('--dry-run')

const prisma = new PrismaClient()

async function main() {
  if (DRY_RUN) {
    console.log('DRY RUN — no changes will be saved\n')
  }

  // Find items without normalisedName (idempotent query)
  const items = await prisma.$queryRaw<
    { id: string; name: string; normalisedName: string | null }[]
  >`
    SELECT id, name, "normalisedName"
    FROM "MasterListItem"
    WHERE "normalisedName" IS NULL
    ORDER BY name ASC
  `

  if (items.length === 0) {
    console.log('All items already have normalisedName set. Nothing to do.')
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
      // Step 1: Get normalisedName from LLM normalisation
      const normResults = await normaliseMasterItems(
        batch.map((item) => ({ id: item.id, name: item.name }))
      )

      // Step 2: Extract normalisedNames for embedding
      const normalisedNames: string[] = []
      const validItems: Array<{ id: string; name: string; normalisedName: string }> = []

      for (const item of batch) {
        const result = normResults.find((r) => r.id === item.id)
        if (result) {
          const normalisedName = result.normalisedName ?? result.baseIngredient
          normalisedNames.push(normalisedName)
          validItems.push({ id: item.id, name: item.name, normalisedName })
          console.log(`  "${item.name}" → normalised: "${normalisedName}"`)
        } else {
          console.log(`  ⚠ "${item.name}" — no normalisation result (skipping)`)
          errors++
        }
      }

      if (validItems.length === 0) {
        console.log('  No valid items in this batch\n')
        continue
      }

      // Step 3: Compute embeddings from normalisedName
      const embeddings = await computeEmbeddings(normalisedNames)

      // Step 4: Write to DB
      if (!DRY_RUN) {
        for (let j = 0; j < validItems.length; j++) {
          await prisma.masterListItem.update({
            where: { id: validItems[j].id },
            data: {
              normalisedName: validItems[j].normalisedName,
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
