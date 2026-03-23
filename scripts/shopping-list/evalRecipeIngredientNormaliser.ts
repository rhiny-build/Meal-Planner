/**
 * Eval runner for the ingredient normalisation pipeline.
 *
 * Runs a golden set of inputs through normaliseIngredient and reports
 * PASS / FAIL / INTERESTING results grouped by zone.
 *
 * Usage:
 *   npx tsx scripts/evalNormaliser.ts              # deterministic only
 *   USE_LLM=true npx tsx scripts/evalNormaliser.ts # with LLM fallback
 */

import 'dotenv/config'
import { normaliseIngredient } from '../lib/shopping-list/normaliseRecipeIngredient'

// ── Types ───────────────────────────────────────────────────────────────────

type Zone = 'deterministic' | 'semantic' | 'hard'
type Verdict = 'PASS' | 'FAIL' | 'INTERESTING'

interface TestCase {
  input: string
  expectedCanonical: string
  zone: Zone
  notes?: string
}

interface TestResult extends TestCase {
  actualCanonical: string
  verdict: Verdict
}

// ── Golden Set ──────────────────────────────────────────────────────────────

const goldenSet: TestCase[] = [
  // Zone 1: Deterministic — normaliseName should handle these correctly
  {
    input: 'tinned tomatoes',
    expectedCanonical: 'tomato (tinned)',
    zone: 'deterministic',
    notes: 'Form keyword "tinned" + singularisation',
  },
  {
    input: 'garlic cloves',
    expectedCanonical: 'garlic (fresh)',
    zone: 'deterministic',
    notes: '"cloves" maps to fresh form',
  },
  {
    input: 'dried oregano',
    expectedCanonical: 'oregano (dried)',
    zone: 'deterministic',
    notes: 'Straightforward form extraction',
  },
  {
    input: 'ground beef',
    expectedCanonical: 'ground beef',
    zone: 'deterministic',
    notes: 'Compound exception — "ground" is not a form here',
  },
  {
    input: 'frozen peas',
    expectedCanonical: 'pea (frozen)',
    zone: 'deterministic',
    notes: 'Form keyword + singularisation',
  },

  // Zone 2: Semantic gaps — normaliseName is purely deterministic so it
  // cannot resolve synonyms, regional names, or reclassify products.
  {
    input: 'scallion',
    expectedCanonical: 'spring onion',
    zone: 'semantic',
    notes: 'US→UK synonym — needs a synonym map or LLM',
  },
  {
    input: 'courgette',
    expectedCanonical: 'courgette',
    zone: 'semantic',
    notes: 'UK name — acceptable as-is, but could map to "zucchini" for US users',
  },
  {
    input: 'coriander',
    expectedCanonical: 'coriander',
    zone: 'semantic',
    notes: 'UK name — acceptable as-is, US equivalent is "cilantro"',
  },
  {
    input: 'aubergine',
    expectedCanonical: 'aubergine',
    zone: 'semantic',
    notes: 'UK name — acceptable as-is, US equivalent is "eggplant"',
  },
  {
    input: 'passata',
    expectedCanonical: 'tomato (passata)',
    zone: 'semantic',
    notes: 'Product name → base ingredient + form. Needs LLM or synonym map',
  },
  {
    input: 'double cream',
    expectedCanonical: 'cream (double)',
    zone: 'semantic',
    notes: '"double" is a form of cream but not in FORM_KEYWORDS',
  },

  // Zone 3: Hard calls — ambiguous or context-dependent
  {
    input: 'baby spinach',
    expectedCanonical: 'spinach',
    zone: 'hard',
    notes: '"baby" is a variety, not a form — should it be stripped?',
  },
  {
    input: 'cherry tomatoes',
    expectedCanonical: 'tomato (cherry)',
    zone: 'hard',
    notes: '"cherry" is a variety — form or not?',
  },
  {
    input: 'vegetable stock',
    expectedCanonical: 'vegetable stock',
    zone: 'hard',
    notes: 'Compound product — should stay as-is',
  },
  {
    input: 'butter',
    expectedCanonical: 'butter',
    zone: 'hard',
    notes: 'Simple ingredient, no form',
  },
  {
    input: 'plain flour',
    expectedCanonical: 'flour (plain)',
    zone: 'hard',
    notes: '"plain" is a type of flour — form extraction or not?',
  },
  {
    input: 'sea salt',
    expectedCanonical: 'salt',
    zone: 'hard',
    notes: '"sea" is a variety — should it be stripped to just "salt"?',
  },
  {
    input: 'free range eggs',
    expectedCanonical: 'egg',
    zone: 'hard',
    notes: '"free range" is a quality marker, not meaningful for shopping list matching',
  },
]

// ── Runner ──────────────────────────────────────────────────────────────────

async function run(): Promise<TestResult[]> {
  const results: TestResult[] = []

  for (const tc of goldenSet) {
    const { canonical: actualCanonical } = await normaliseIngredient(tc.input)
    const pass = actualCanonical === tc.expectedCanonical

    let verdict: Verdict = pass ? 'PASS' : 'FAIL'

    // Mark semantic and hard zone failures as INTERESTING rather than FAIL —
    // these are known gaps where the deterministic normaliser isn't expected
    // to handle them yet.
    if (!pass && (tc.zone === 'semantic' || tc.zone === 'hard')) {
      verdict = 'INTERESTING'
    }

    results.push({ ...tc, actualCanonical, verdict })
  }

  return results
}

// ── Reporting ───────────────────────────────────────────────────────────────

function report(results: TestResult[]): void {
  const zones: Zone[] = ['deterministic', 'semantic', 'hard']

  console.log('\n══════════════════════════════════════════════')
  console.log('  Ingredient Normaliser — Eval Report')
  console.log(`  mode: ${process.env.USE_LLM ? 'deterministic + LLM' : 'deterministic only'}`)
  console.log('══════════════════════════════════════════════\n')

  // Summary by zone
  for (const zone of zones) {
    const zoneResults = results.filter((r) => r.zone === zone)
    const passes = zoneResults.filter((r) => r.verdict === 'PASS').length
    const total = zoneResults.length
    const pct = total > 0 ? Math.round((passes / total) * 100) : 0
    console.log(`  ${zone.padEnd(15)} ${passes}/${total} pass (${pct}%)`)
  }

  const totalPass = results.filter((r) => r.verdict === 'PASS').length
  console.log(`  ${'TOTAL'.padEnd(15)} ${totalPass}/${results.length} pass (${Math.round((totalPass / results.length) * 100)}%)`)

  // Failures
  const fails = results.filter((r) => r.verdict === 'FAIL')
  if (fails.length > 0) {
    console.log('\n── FAIL ───────────────────────────────────────\n')
    for (const r of fails) {
      console.log(`  [${r.zone}] "${r.input}"`)
      console.log(`    expected: "${r.expectedCanonical}"`)
      console.log(`    actual:   "${r.actualCanonical}"`)
      if (r.notes) console.log(`    notes:    ${r.notes}`)
      console.log()
    }
  }

  // Interesting
  const interesting = results.filter((r) => r.verdict === 'INTERESTING')
  if (interesting.length > 0) {
    console.log('── INTERESTING ────────────────────────────────\n')
    for (const r of interesting) {
      console.log(`  [${r.zone}] "${r.input}"`)
      console.log(`    expected: "${r.expectedCanonical}"`)
      console.log(`    actual:   "${r.actualCanonical}"`)
      if (r.notes) console.log(`    notes:    ${r.notes}`)
      console.log()
    }
  }

  if (fails.length === 0 && interesting.length === 0) {
    console.log('\n  All tests passed!\n')
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

run().then(report)
