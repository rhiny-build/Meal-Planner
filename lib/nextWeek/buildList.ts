/**
 * Build the "Next week" list (pure logic): meals first, then the usual weekly items, then "Do you need these?".
 *
 * Which item an ingredient means comes from the saved answers (IngredientMatch), never worked out here.
 *
 * Meal ingredient rules:
 *  - fresh ingredient (fresh aisles): ticked, "Fresh, for Tue"; other non-cupboard items (sweets, drinks,
 *    household, frozen): ticked, "For Tue"
 *  - cupboard ingredient: ticked only if likely out (last bought more than 1.5x its usual gap ago); more than
 *    2x the gap ago it is unticked, "Not bought for a long time, check"; otherwise unticked with the reason;
 *    bought only once: unticked, "check"
 *  - an item a meal needs is removed from the other two sections (greyed "see Tue" in the usual items)
 *  - two meals needing the same item: one line, "for Mon + Thu"
 *  - saved as "not bought": the plain ingredient name, unticked
 *  - model unsure (or no answer yet): the plain ingredient name, unticked, "check"
 */

import { AISLES } from './aisles'
import { ingredientKey } from './matchIngredient'
import { predict, rhythm, restockReason, weeksBetween, type History } from './predict'
import type { SavedMatch } from './resolveMatches'

export interface ItemInfo {
  aisle: string
  cupboard: boolean
}

export interface MealInput {
  /** Short day name, "Mon" */
  day: string
  /** "Salmon Pea Pasta" */
  name: string
  ingredients: string[]
}

export interface ListLine {
  /** Stable key for ticks: "item:<item>" or "raw:<ingredient>" */
  key: string
  /** What goes on the Sainsbury's list: the product bought most recently, or the plain ingredient name */
  label: string
  /** The item behind the line (absent for unmatched ingredients) */
  item?: string
  aisle?: string
  why: string
  ticked: boolean
  /** Shown but not tickable: the meals section already has it */
  greyed?: boolean
  /** Meal lines only: the recipe ingredient name(s) behind the line, what a fix is saved against */
  ingredients?: string[]
  /** Meal lines only: matched to an item, saved as not bought, or needs checking */
  match?: 'matched' | 'none' | 'check'
}

export interface MealCard {
  day: string
  name: string
  lines: ListLine[]
}

export interface AisleGroup {
  aisle: string
  lines: ListLine[]
}

export interface NextWeekList {
  meals: MealCard[]
  usual: AisleGroup[]
  maybe: ListLine[]
}

export const CUPBOARD_RUN_OUT_FACTOR = 1.5
/** Past this many times its usual gap a cupboard item is probably not something he still buys */
export const CUPBOARD_TOO_LONG_FACTOR = 2

/** Aisles whose items are fresh food; "Fresh" is only said for these */
export const FRESH_AISLES: readonly string[] = ['Fresh produce', 'Dairy and eggs', 'Meat and deli', 'Fish', 'Bakery']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const shortDate = (date: string) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`
const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)
const joinDays = (days: string[]) => days.join(' + ')

interface BuildInput {
  history: History
  catalog: Map<string, ItemInfo>
  meals: MealInput[]
  /** Order (delivery) date, YYYY-MM-DD */
  target: string
  /** Ticks Ronen changed on the page: key -> ticked */
  overrides?: Record<string, boolean>
  /** Saved ingredient answers by ingredient key (see ingredientKey) */
  matches?: Map<string, SavedMatch>
}

export function buildNextWeekList({ history, catalog, meals, target, overrides = {}, matches = new Map() }: BuildInput): NextWeekList {
  const tick = (key: string, fallback: boolean) => overrides[key] ?? fallback

  // 1. Which meals need which item (one entry per item or unmatched ingredient, in plan order)
  interface Need {
    key: string
    item: string | null
    ingredient: string
    /** Every recipe wording that ended up on this line */
    ingredients: string[]
    match: 'matched' | 'none' | 'check'
    days: string[]
    firstMeal: number
  }
  const needs = new Map<string, Need>()
  meals.forEach((meal, mealIndex) => {
    for (const ingredient of meal.ingredients) {
      const ingredientId = ingredientKey(ingredient)
      const saved = matches.get(ingredientId)
      const item = saved?.status === 'matched' && saved.itemName && history.dates.has(saved.itemName) ? saved.itemName : null
      const match = item ? 'matched' : saved?.status === 'none' ? 'none' : 'check'
      const key = item ? `item:${item}` : `raw:${ingredientId}`
      const need = needs.get(key)
      if (!need) needs.set(key, { key, item, ingredient, ingredients: [ingredient], match, days: [meal.day], firstMeal: mealIndex })
      else {
        if (!need.days.includes(meal.day)) need.days.push(meal.day)
        if (!need.ingredients.includes(ingredient)) need.ingredients.push(ingredient)
      }
    }
  })

  const needLine = (need: Need): ListLine => {
    const fix = { ingredients: need.ingredients, match: need.match }
    if (!need.item) {
      const why = need.match === 'none' ? 'Not one of your usual items' : 'Not sure which product, check'
      return { key: need.key, label: need.ingredient, why, ticked: tick(need.key, false), ...fix }
    }
    const info = catalog.get(need.item)
    const label = history.lastProduct.get(need.item) ?? need.item
    const forDays = joinDays(need.days)
    const base = { key: need.key, label, item: need.item, aisle: info?.aisle, ...fix }
    if (!info?.cupboard) {
      const fresh = FRESH_AISLES.includes(info?.aisle ?? '')
      return { ...base, why: fresh ? `Fresh, for ${forDays}` : `For ${forDays}`, ticked: tick(need.key, true) }
    }
    const r = rhythm(history.dates.get(need.item) ?? [])
    const since = weeksBetween(r.lastDate, target)
    if (r.medianGap === null) {
      return { ...base, why: `Cupboard: bought once, ${shortDate(r.lastDate)}, check`, ticked: tick(need.key, false) }
    }
    if (since > CUPBOARD_TOO_LONG_FACTOR * r.medianGap) {
      return { ...base, why: 'Not bought for a long time, check', ticked: tick(need.key, false) }
    }
    if (since > CUPBOARD_RUN_OUT_FACTOR * r.medianGap) {
      return {
        ...base,
        why: `Cupboard, but likely out: ${lowerFirst(restockReason(r.medianGap, since))}`,
        ticked: tick(need.key, true),
      }
    }
    return { ...base, why: `Cupboard: ${label} bought ${shortDate(r.lastDate)}, probably have`, ticked: tick(need.key, false) }
  }

  // 2. Meal cards: each need sits in the first meal that wants it; later meals point to it
  const cards: MealCard[] = meals.map(meal => ({ day: meal.day, name: meal.name, lines: [] }))
  for (const need of needs.values()) cards[need.firstMeal].lines.push(needLine(need))
  meals.forEach((meal, mealIndex) => {
    for (const need of needs.values()) {
      if (need.firstMeal !== mealIndex && need.days.includes(meal.day)) {
        const label = need.item ? (history.lastProduct.get(need.item) ?? need.item) : need.ingredient
        cards[mealIndex].lines.push({ key: `${need.key}@${meal.day}`, label, item: need.item ?? undefined, why: `see ${need.days[0]}`, ticked: false, greyed: true })
      }
    }
  })

  // 3. Usual weekly items and "Do you need these?", without what the meals already cover
  const prediction = predict(history, target)
  const claimed = (item: string) => needs.get(`item:${item}`)
  const aisleOf = (item: string) => catalog.get(item)?.aisle ?? 'Other'

  const usualLines: ListLine[] = prediction.usual.map(u => {
    const key = `item:${u.item}`
    const need = claimed(u.item)
    return need
      ? { key, label: u.lastProduct, item: u.item, aisle: aisleOf(u.item), why: `see ${need.days[0]}`, ticked: false, greyed: true }
      : { key, label: u.lastProduct, item: u.item, aisle: aisleOf(u.item), why: '', ticked: tick(key, true) }
  })
  const usual: AisleGroup[] = [...AISLES, ...new Set(usualLines.map(l => l.aisle!))]
    .filter((aisle, i, all) => all.indexOf(aisle) === i)
    .map(aisle => ({ aisle, lines: usualLines.filter(l => l.aisle === aisle) }))
    .filter(g => g.lines.length > 0)

  const maybe: ListLine[] = prediction.maybe
    .filter(m => !claimed(m.item))
    .map(m => {
      const key = `item:${m.item}`
      return { key, label: m.lastProduct, item: m.item, aisle: aisleOf(m.item), why: m.reason, ticked: tick(key, false) }
    })

  return { meals: cards, usual, maybe }
}

/** One product name per line, for every ticked line (a product that appears twice is listed once). */
export function copyText(list: NextWeekList): string {
  const labels = [...list.meals.flatMap(m => m.lines), ...list.usual.flatMap(g => g.lines), ...list.maybe]
    .filter(l => l.ticked && !l.greyed)
    .map(l => l.label)
  return [...new Set(labels)].join('\n')
}

export function tickedCount(list: NextWeekList): number {
  return copyText(list) ? copyText(list).split('\n').length : 0
}
