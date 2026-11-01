/**
 * Prints the old-versus-new match for the demo week (scripts/rehaul/seedMatchingDemo.ts) as a markdown table,
 * from the recorded model answers (free).   npx tsx scripts/rehaul/sideBySide.ts
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { exactItemMatch, matchIngredient } from '@/lib/nextWeek/matchIngredient'
import { toSavedAnswer, type ModelAnswer } from '@/lib/nextWeek/resolveMatches'
import type { CaseSet } from '@/lib/nextWeek/scoreMatching'
import { DEMO_RECIPES } from './seedMatchingDemo'

const dir = path.resolve(__dirname, '../../tests/fixtures/matching')
const caseSet: CaseSet = JSON.parse(readFileSync(path.join(dir, 'cases.json'), 'utf8'))
const recorded: { answers: Record<string, ModelAnswer> } = JSON.parse(readFileSync(path.join(dir, 'recorded-answers.json'), 'utf8'))
const items = caseSet.items.map(i => ({ item: i.item, bought: i.bought }))

console.log('| Meal | Ingredient | Old match | New match |\n|---|---|---|---|')
for (const recipe of DEMO_RECIPES) {
  for (const name of recipe.ingredients) {
    const old = matchIngredient(name, items) ?? 'no match (check)'
    const exact = exactItemMatch(name, items)
    const saved = toSavedAnswer(recorded.answers[name], caseSet.items)
    const now = exact ?? (saved.status === 'matched' ? saved.itemName : saved.status === 'none' ? 'not bought' : 'unsure (check)')
    console.log(`| ${recipe.name} | ${name} | ${old} | ${now}${exact ? ' (exact)' : ''} |`)
  }
}
