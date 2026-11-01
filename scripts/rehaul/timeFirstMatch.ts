/**
 * Times the first match over every ingredient name of the production recipes, against a LOCAL database
 * (clears its IngredientMatch table). One REAL full model run: costs about 40k tokens.
 *   ANTHROPIC_API_KEY=$DEV_ANTHROPIC_API_KEY npx tsx scripts/rehaul/timeFirstMatch.ts
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { claudeMatcher, resolveIngredientMatches, type TokenUsage } from '@/lib/nextWeek/resolveMatches'
import type { CaseSet } from '@/lib/nextWeek/scoreMatching'

async function main() {
  if (!/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) throw new Error('Local database only')
  const prisma = new PrismaClient()
  const dir = path.resolve(__dirname, '../../tests/fixtures/matching')
  const caseSet: CaseSet = JSON.parse(readFileSync(path.join(dir, 'cases.json'), 'utf8'))
  await prisma.ingredientMatch.deleteMany()
  const usage: TokenUsage = { input: 0, output: 0 }
  const started = Date.now()
  const result = await resolveIngredientMatches(prisma, caseSet.cases.map(c => c.name), caseSet.items, claudeMatcher(usage), { budgetMs: 10 * 60_000 })
  const seconds = (Date.now() - started) / 1000
  console.log(`${caseSet.cases.length} names: ${result.asked} asked the model, ${result.unresolved} unresolved, ${seconds.toFixed(1)} s, tokens in ${usage.input} out ${usage.output}`)
  await prisma.$disconnect()
}
main()
