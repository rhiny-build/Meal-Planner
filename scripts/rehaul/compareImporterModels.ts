/**
 * Runs the recipe importer once per (case, model) with real Claude and prints a JSON summary
 * (output draft, tokens, cost, time, turns). Used for the Haiku-vs-Sonnet comparison.
 *
 *   ANTHROPIC_API_KEY=$DEV_ANTHROPIC_API_KEY npx tsx scripts/rehaul/compareImporterModels.ts \
 *     --out /path/results.json [--only <case-id>] [--models sonnet,haiku]
 *
 * Costs real money: 5 cases x 2 models. Prices are USD per million tokens (pricing docs, 5-minute cache).
 */

import { writeFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'
import { getAnthropic } from '../../lib/ai/claude'
import { CLAUDE_MODELS } from '../../lib/ai/config'
import { classifyImportInput, runRecipeImporter } from '../../lib/agents/recipeImporter'

const prisma = new PrismaClient()

// The run log keeps cache numbers per run, not per turn; record each response's usage here.
let usageLog: Array<{ in: number; out: number; cacheRead: number; cacheWrite: number }> = []
const messages = getAnthropic().messages
const originalCreate = messages.create.bind(messages) as (...a: any[]) => Promise<any>
;(messages as any).create = async (...a: any[]) => {
  const response = await originalCreate(...a)
  const u = response.usage
  usageLog.push({
    in: u.input_tokens,
    out: u.output_tokens,
    cacheRead: u.cache_read_input_tokens ?? 0,
    cacheWrite: u.cache_creation_input_tokens ?? 0,
  })
  return response
}

const CASES = [
  { id: '1-clean', input: 'https://www.recipetineats.com/oven-baked-chicken-schnitzel/' },
  { id: '2-messy', input: 'https://www.bowlofdelicious.com/caldo-verde/' },
  { id: '3-no-method', input: process.env.CASE3_URL ?? 'https://www.themediterraneandish.com/fast-dinner-recipes/' },
  { id: '4-dead-link', input: 'https://www.recipetineats.com/this-recipe-does-not-exist-404-check/' },
  {
    id: '5-free-text',
    input: 'My schnitzel: chicken breast flattened, dip in egg, then breadcrumbs, fry 4 minutes a side in oil.',
  },
]

const MODELS: Record<string, string> = { sonnet: CLAUDE_MODELS.agent, haiku: CLAUDE_MODELS.cheap }
const PRICES: Record<string, { in: number; out: number; write: number; read: number }> = {
  [CLAUDE_MODELS.agent]: { in: 2, out: 10, write: 2.5, read: 0.1 },
  [CLAUDE_MODELS.cheap]: { in: 0.1, out: 0.5, write: 0.125, read: 0.01 },
}

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const only = arg('only')
  const models = (arg('models') ?? 'sonnet,haiku').split(',')
  const results: unknown[] = []
  for (const c of CASES.filter((c) => !only || c.id === only)) {
    for (const key of models) {
      const model = MODELS[key]
      usageLog = []
      const started = Date.now()
      const result = await runRecipeImporter(classifyImportInput(c.input), 'manual', { model })
      const seconds = (Date.now() - started) / 1000
      const run = await prisma.agentRun.findUniqueOrThrow({ where: { id: result.runId } })
      const p = PRICES[model]
      const costUsd =
        (run.inputTokens * p.in + run.outputTokens * p.out + run.cacheCreationTokens * p.write + run.cacheReadTokens * p.read) /
        1e6
      const perTurn = usageLog
      const row = {
        case: c.id,
        modelKey: key,
        model,
        ok: result.ok,
        error: result.error,
        output: result.output,
        seconds,
        turns: perTurn.length,
        tokens: {
          input: run.inputTokens,
          output: run.outputTokens,
          cacheRead: run.cacheReadTokens,
          cacheWrite: run.cacheCreationTokens,
        },
        perTurn,
        costUsd,
      }
      results.push(row)
      console.log(`${c.id} ${key}: ok=${result.ok} turns=${perTurn.length} $${costUsd.toFixed(4)} ${seconds.toFixed(1)}s`)
      const out = arg('out')
      if (out) writeFileSync(out, JSON.stringify(results, null, 2))
    }
  }
}

main().finally(() => prisma.$disconnect())
