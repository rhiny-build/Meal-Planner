import 'dotenv/config'
import * as readline from 'readline'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function ask(q: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(q, (a) => {
      rl.close()
      resolve(a.trim().toLowerCase() === 'y')
    })
  })
}

async function main() {
  const cutoff = new Date('2022-01-01T00:00:00.000Z')

  const staleRows = await prisma.purchaseHistory.findMany({
    where: { purchaseDate: { lt: cutoff } },
    select: { purchaseDate: true },
  })

  if (staleRows.length === 0) {
    console.log('No rows before 2022 found — nothing to delete.')
    return
  }

  const distinctDates = new Set(staleRows.map((r) => r.purchaseDate.toISOString().slice(0, 10)))
  console.log(`Found ${staleRows.length} PurchaseHistory row(s) from ${distinctDates.size} receipt date(s):`)
  for (const d of [...distinctDates].sort()) console.log(`  ${d}`)

  const logCount = await prisma.agentClassificationLog.count()
  console.log(`\nAll ${logCount} AgentClassificationLog row(s) will also be cleared (clean slate — no proposals confirmed yet).`)
  console.log('\nThis cannot be undone without a database restore.')

  const ok = await ask('Proceed? (y/n) ')
  if (!ok) {
    console.log('Aborted.')
    return
  }

  const { count: logsDeleted } = await prisma.agentClassificationLog.deleteMany()
  console.log(`Deleted ${logsDeleted} AgentClassificationLog row(s).`)

  const { count: rowsDeleted } = await prisma.purchaseHistory.deleteMany({
    where: { purchaseDate: { lt: cutoff } },
  })
  console.log(`Deleted ${rowsDeleted} PurchaseHistory row(s).`)
  console.log('Done. Re-run the agent to reclassify with clean data.')
}

main()
  .catch((err) => { console.error('Fatal:', err); process.exit(1) })
  .finally(() => prisma.$disconnect())
