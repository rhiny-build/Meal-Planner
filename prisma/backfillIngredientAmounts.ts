/**
 * Backfill: fill Ingredient.amount from the free-text quantity.
 *
 * Only touches `amount`, and only on rows where amount is still null and a
 * quantity exists. quantity/unit are never changed. Idempotent: re-running
 * only retries rows that did not parse before, and prints a report.
 *
 * Usage:
 *   npx tsx prisma/backfillIngredientAmounts.ts            # apply
 *   npx tsx prisma/backfillIngredientAmounts.ts --dry-run  # report only
 *   add --list to print the quantities that stayed null
 */

import { PrismaClient } from '@prisma/client'
import { parseAmount } from '../lib/ingredientAmount'

const prisma = new PrismaClient()

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const list = process.argv.includes('--list')

  const total = await prisma.ingredient.count()
  const alreadyDone = await prisma.ingredient.count({ where: { amount: { not: null } } })
  const noQuantity = await prisma.ingredient.count({
    where: { amount: null, OR: [{ quantity: null }, { quantity: '' }] },
  })
  const candidates = await prisma.ingredient.findMany({
    where: { amount: null, quantity: { not: null }, NOT: { quantity: '' } },
    select: { id: true, quantity: true, unit: true },
  })

  let parsed = 0
  const unparsed: string[] = []
  for (const ing of candidates) {
    const { amount } = parseAmount(ing.quantity, ing.unit)
    if (amount === null) {
      unparsed.push([ing.quantity, ing.unit].filter(Boolean).join(' | unit: '))
      continue
    }
    parsed++
    if (!dryRun) {
      // Raw SQL so updatedAt is left untouched (this is a data fix, not an edit)
      await prisma.$executeRaw`UPDATE "Ingredient" SET "amount" = ${amount} WHERE "id" = ${ing.id}`
    }
  }

  console.log(
    `Ingredient amount backfill${dryRun ? ' (dry run)' : ''}: ` +
      `${total} ingredients; ${alreadyDone} already had an amount; ${noQuantity} have no quantity; ` +
      `${candidates.length} checked: ${parsed} parsed, ${unparsed.length} left null.`
  )
  if (list && unparsed.length) {
    const counts = new Map<string, number>()
    for (const u of unparsed) counts.set(u, (counts.get(u) ?? 0) + 1)
    for (const [q, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${n}x  ${q}`)
    }
  }
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
