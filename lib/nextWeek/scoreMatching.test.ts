/**
 * The quality bar for ingredient matching, checked on every test run from the recorded model answers
 * (no model call). Re-record with scripts/rehaul/scoreIngredientMatching.ts when the prompt or model changes.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { exactItemMatch, matchIngredient } from './matchIngredient'
import { toSavedAnswer, type ModelAnswer } from './resolveMatches'
import { scoreCases, type CaseSet } from './scoreMatching'

const fixture = (name: string) => path.resolve(__dirname, '../../tests/fixtures/matching', name)
const caseSet: CaseSet = JSON.parse(readFileSync(fixture('cases.json'), 'utf8'))
const recorded: { answers: Record<string, ModelAnswer> } = JSON.parse(readFileSync(fixture('recorded-answers.json'), 'utf8'))
const items = caseSet.items.map(i => ({ item: i.item, bought: i.bought }))

describe('ingredient matching on the real cases', () => {
  it('covers every distinct ingredient name of the production recipes', () => {
    const names: string[] = JSON.parse(readFileSync(fixture('recipe-ingredient-names.json'), 'utf8'))
    expect(caseSet.cases.map(c => c.name).sort()).toEqual([...names].sort())
  })

  it('the table rows are all in the case set', () => {
    expect(caseSet.cases.filter(c => c.tableRow).map(c => c.name).sort()).toEqual(
      ['El Paso Tortilla Kit', 'Chicken strips', 'Fries', 'Garlic powder', 'Grated Mozzarela', 'Ground Turkey', 'Mayo', 'Sweet Corn'].sort()
    )
  })

  it('the old matcher fails the table rows (the problem this fixes)', () => {
    const score = scoreCases(caseSet.cases, name => matchIngredient(name, items) ?? 'none')
    expect(score.tableRows.right).toBeLessThan(score.tableRows.total)
  })

  it('the new matcher gets every table row right and at least 95% of the rest', () => {
    const score = scoreCases(caseSet.cases, name => {
      const exact = exactItemMatch(name, items)
      if (exact) return exact
      const saved = toSavedAnswer(recorded.answers[name], caseSet.items)
      return saved.status === 'matched' ? saved.itemName! : saved.status
    })
    expect(score.misses.filter(m => m.tableRow)).toEqual([])
    expect(score.tableRows.right).toBe(score.tableRows.total)
    expect(score.rest.percent).toBeGreaterThanOrEqual(95)
  })

  it('every name that needs the model has a recorded answer', () => {
    const missing = caseSet.cases.map(c => c.name).filter(n => !exactItemMatch(n, items) && !recorded.answers[n])
    expect(missing).toEqual([])
  })
})
