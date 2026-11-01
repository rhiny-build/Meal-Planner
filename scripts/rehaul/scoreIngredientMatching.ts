/**
 * Score ingredient matching against the real cases (tests/fixtures/matching/cases.json).
 *
 *   npx tsx scripts/rehaul/scoreIngredientMatching.ts old            # the old word matcher (free)
 *   npx tsx scripts/rehaul/scoreIngredientMatching.ts new            # new matcher from recorded model answers (free)
 *   ANTHROPIC_API_KEY=$DEV_ANTHROPIC_API_KEY npx tsx scripts/rehaul/scoreIngredientMatching.ts new --record
 *                                                                   # REAL model run over all names; re-records the answers
 *   ANTHROPIC_API_KEY=$DEV_ANTHROPIC_API_KEY npx tsx scripts/rehaul/scoreIngredientMatching.ts new --record-missing
 *                                                                   # REAL model run only for names with no recorded answer yet
 *
 * `--record` costs real tokens (about 9 calls of 40 names). Run it only when the prompt, the model or the
 * case set changes. The recorded answers also drive the unit test, so the score is checked on every `npm test`.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { matchIngredient, exactItemMatch } from '@/lib/nextWeek/matchIngredient'
import { MATCH_BATCH_SIZE, claudeMatcher, toSavedAnswer, type ModelAnswer, type TokenUsage } from '@/lib/nextWeek/resolveMatches'
import { scoreCases, type CaseSet, type Score } from '@/lib/nextWeek/scoreMatching'

const root = path.resolve(__dirname, '../..')
const casesPath = path.join(root, 'tests/fixtures/matching/cases.json')
const recordedPath = path.join(root, 'tests/fixtures/matching/recorded-answers.json')

export interface Recorded {
  model: string
  recordedAt: string
  usage: TokenUsage
  /** Ingredient name -> the model's raw answer, for the names that have no exact match */
  answers: Record<string, ModelAnswer>
}

const caseSet: CaseSet = JSON.parse(readFileSync(casesPath, 'utf8'))
const itemsForOld = caseSet.items.map(i => ({ item: i.item, bought: i.bought }))

function report(label: string, score: Score) {
  console.log(`\n${label}`)
  console.log(`  Table rows: ${score.tableRows.right}/${score.tableRows.total}`)
  console.log(`  Rest:       ${score.rest.right}/${score.rest.total} = ${score.rest.percent}%  (${score.unsure} answered "unsure")`)
  for (const m of score.misses) console.log(`    ${m.tableRow ? '[TABLE] ' : ''}${m.name}: expected ${m.expected}, got ${m.got}`)
}

async function main() {
  const mode = process.argv[2]
  const recordAll = process.argv.includes('--record')
  const recordMissing = process.argv.includes('--record-missing')
  if (mode === 'old') {
    report('OLD word matcher', scoreCases(caseSet.cases, name => matchIngredient(name, itemsForOld) ?? 'none'))
    return
  }
  if (mode !== 'new') throw new Error('Usage: old | new [--record]')

  let recorded: Recorded
  if (recordAll || recordMissing) {
    const previous: Recorded | null = recordMissing ? JSON.parse(readFileSync(recordedPath, 'utf8')) : null
    const usage: TokenUsage = previous ? { ...previous.usage } : { input: 0, output: 0 }
    const call = claudeMatcher(usage)
    const needModel = caseSet.cases
      .map(c => c.name)
      .filter(n => !exactItemMatch(n, itemsForOld) && !previous?.answers[n])
    const answers: Record<string, ModelAnswer> = { ...(previous?.answers ?? {}) }
    for (let i = 0; i < needModel.length; i += MATCH_BATCH_SIZE) {
      for (const a of await call(needModel.slice(i, i + MATCH_BATCH_SIZE), caseSet.items)) answers[a.name] = a
    }
    recorded = { model: 'cheap (see lib/ai/config.ts)', recordedAt: new Date().toISOString().slice(0, 10), usage, answers }
    writeFileSync(recordedPath, JSON.stringify(recorded, null, 1) + '\n')
    console.log(`Asked the model about ${needModel.length} names; ${Object.keys(answers).length} answers recorded; tokens in ${usage.input}, out ${usage.output}`)
  } else {
    recorded = JSON.parse(readFileSync(recordedPath, 'utf8'))
  }

  report(
    'NEW matcher (exact match, then the model)',
    scoreCases(caseSet.cases, name => {
      const exact = exactItemMatch(name, itemsForOld)
      if (exact) return exact
      const saved = toSavedAnswer(recorded.answers[name], caseSet.items)
      return saved.status === 'matched' ? saved.itemName! : saved.status
    })
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
