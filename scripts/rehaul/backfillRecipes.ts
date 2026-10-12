/**
 * S07: one-off backfill of the existing recipe book.
 *
 *   Dry run (default). Reads the book, runs the importer agent in ENRICH mode on every recipe
 *   that has a source URL, and writes backfill-report.md + backfill-report.json. Changes no recipe,
 *   ingredient, step or meal plan. (It does add AgentRun rows, trigger "batch", so each run shows on /agent-runs.)
 *
 *     ANTHROPIC_API_KEY=... npx tsx scripts/rehaul/backfillRecipes.ts --dry-run
 *
 *   Apply. Carries out the entries still in the JSON (delete the lines you do not want first).
 *   Refuses to run without --i-have-a-backup. Idempotent: re-running changes nothing more.
 *
 *     npx tsx scripts/rehaul/backfillRecipes.ts --apply backfill-report.json --i-have-a-backup
 *
 * Options: --delay-ms 3000 (pause between agent runs), --token-budget 1500000, --only <text>,
 * --limit <n>, --out-dir <dir>, --note "<text shown at the top of the report>".
 * Local fixture pages need ALLOW_PRIVATE_FETCH=1 (ignored in production).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'
import { AI_CONFIG } from '../../lib/ai/config'
import { applyReport, parseReport } from '../../lib/agents/recipeBackfill/apply'
import { BACKUP_INSTRUCTIONS, describeDatabase, parseArgs } from '../../lib/agents/recipeBackfill/cli'
import { buildBackfillPlan } from '../../lib/agents/recipeBackfill/plan'
import { renderMarkdown } from '../../lib/agents/recipeBackfill/report'
import { runRecipeImporter } from '../../lib/agents/recipeImporter'

const prisma = new PrismaClient()
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

async function dryRun(args: ReturnType<typeof parseArgs>) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set (needed to read the source pages)')
  mkdirSync(args.outDir, { recursive: true })
  const jsonPath = join(args.outDir, 'backfill-report.json')
  const mdPath = join(args.outDir, 'backfill-report.md')
  const database = describeDatabase(process.env.DATABASE_URL)
  console.log(`Dry run against ${database}. Nothing will be changed in the recipe book.`)

  const report = await buildBackfillPlan(
    prisma,
    {
      runImporter: (url, enrich) => runRecipeImporter({ url }, 'batch', { enrich }),
      runTokens: async (runId) => {
        const run = await prisma.agentRun.findUnique({ where: { id: runId }, select: { inputTokens: true, outputTokens: true } })
        return { inputTokens: run?.inputTokens ?? 0, outputTokens: run?.outputTokens ?? 0 }
      },
      sleep,
      delayMs: args.delayMs,
      tokenBudget: args.tokenBudget,
      onEntry: (e, done, total) =>
        console.log(`[${done}/${total}] ${e.action.padEnd(9)} ${e.name} - ${e.action === 'leave' ? e.reason : e.summary}`),
    },
    { database, note: args.note, model: AI_CONFIG.recipeImporter.model, only: args.only, limit: args.limit }
  )

  writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n')
  writeFileSync(mdPath, renderMarkdown(report))
  console.log('\nSummary by action:', report.summary)
  console.log(`Agent runs: ${report.tokens.runs}; tokens: ${report.tokens.inputTokens} in, ${report.tokens.outputTokens} out`)
  console.log(`Wrote ${mdPath} and ${jsonPath}`)
}

async function apply(args: ReturnType<typeof parseArgs>) {
  const database = describeDatabase(process.env.DATABASE_URL)
  if (!args.iHaveABackup) {
    console.error(`Refusing to apply to ${database} without --i-have-a-backup.`)
    console.error(BACKUP_INSTRUCTIONS)
    process.exit(1)
  }
  const report = parseReport(JSON.parse(readFileSync(args.reportFile!, 'utf8')))
  console.log(`Applying ${report.entries.length} entries from ${args.reportFile} to ${database}`)
  if (report.database !== database) {
    console.log(`Note: the report was made against ${report.database}, you are applying to ${database}. Entries whose recipe id/name does not match are skipped.`)
  }

  const results = await applyReport(prisma, report)
  for (const r of results) console.log(`${r.status.padEnd(13)} ${r.action.padEnd(9)} ${r.name} - ${r.detail}`)
  const counts = results.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {})
  console.log('\nResult:', counts)
  if (counts.failed) process.exitCode = 1
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.mode === 'apply') await apply(args)
  else await dryRun(args)
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
