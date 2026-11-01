import { describe, expect, it } from 'vitest'
import { buildNextWeekList, copyText, tickedCount, type ItemInfo, type MealInput } from './buildList'
import { ingredientKey } from './matchIngredient'
import { buildHistory, type PurchaseLine } from './predict'
import type { SavedMatch } from './resolveMatches'

const TARGET = '2026-10-20'
const addWeeks = (date: string, weeks: number) => new Date(Date.parse(date) + weeks * 7 * 86400000).toISOString().slice(0, 10)
const LAST = '2026-10-13'

/** 12 weekly orders. `spec`: item -> product name and the weeks-ago it was bought (0 = last order). */
function history(spec: Record<string, { product: string; weeksAgo: number[] }>) {
  const lines: PurchaseLine[] = []
  for (let w = 0; w < 12; w++) lines.push({ date: addWeeks(LAST, -w), productName: 'Filler', item: 'filler' })
  for (const [item, { product, weeksAgo }] of Object.entries(spec)) {
    for (const w of weeksAgo) lines.push({ date: addWeeks(LAST, -w), productName: product, item })
  }
  return buildHistory(lines)
}
/** Saved answers: ingredient wording -> item, "none" (not bought) or "unsure". */
const saved = (answers: Record<string, string>): Map<string, SavedMatch> =>
  new Map(
    Object.entries(answers).map(([name, answer]) => [
      ingredientKey(name),
      answer === 'none' || answer === 'unsure'
        ? { status: answer, itemName: null, source: 'model' }
        : { status: 'matched', itemName: answer, source: 'model' },
    ])
  )
const MATCHES = saved({
  'salmon fillets': 'salmon', salmon: 'salmon', pasta: 'pasta', breadcrumbs: 'breadcrumbs', 'single spice': 'single spice',
  eggs: 'eggs', hummus: 'hummus', 'smoked paprika': 'none', mystery: 'unsure', sweets: 'sweets',
})
const catalog = (cupboardItems: string[] = [], aisles: Record<string, string> = {}) => {
  const map = new Map<string, ItemInfo>()
  return new Proxy(map, {
    get: (target, prop, receiver) =>
      prop === 'get' ? (item: string) => ({ aisle: aisles[item] ?? (cupboardItems.includes(item) ? 'Cupboard' : 'Fresh produce'), cupboard: cupboardItems.includes(item) }) : Reflect.get(target, prop, receiver),
  })
}
const meal = (day: string, name: string, ingredients: string[]): MealInput => ({ day, name, ingredients })
const lineFor = (list: ReturnType<typeof buildNextWeekList>, day: string, key: string) => list.meals.find(m => m.day === day)!.lines.find(l => l.key === key)!

describe('meal ingredient rules', () => {
  const h = history({
    salmon: { product: 'Salmon Fillets x4', weeksAgo: [3, 6] },
    pasta: { product: 'Fusilli 1kg', weeksAgo: [1, 7, 13].filter(w => w < 12) }, // gap 6 weeks, last bought 1 week before the last order
    breadcrumbs: { product: 'Golden Breadcrumbs', weeksAgo: [11, 5, 0].filter(w => w < 12) }, // gaps 6 and 5: usually ~6 weeks
    'single spice': { product: 'Cumin Seeds', weeksAgo: [4] },
  })
  const cat = catalog(['pasta', 'breadcrumbs', 'single spice'])

  it('ticks a fresh ingredient', () => {
    const list = buildNextWeekList({ history: h, catalog: cat, meals: [meal('Mon', 'Salmon Pasta', ['salmon fillets'])], target: TARGET, matches: MATCHES })
    const line = lineFor(list, 'Mon', 'item:salmon')
    expect(line).toMatchObject({ label: 'Salmon Fillets x4', ticked: true, why: 'Fresh, for Mon' })
  })

  it('leaves a cupboard ingredient unticked while it is within 1.5x its usual gap', () => {
    const list = buildNextWeekList({ history: h, catalog: cat, meals: [meal('Mon', 'Pasta', ['pasta'])], target: TARGET, matches: MATCHES })
    const line = lineFor(list, 'Mon', 'item:pasta')
    expect(line.ticked).toBe(false)
    expect(line.why).toMatch(/^Cupboard: Fusilli 1kg bought .*probably have$/)
  })

  it('ticks a cupboard ingredient that is likely out (more than 1.5x its usual gap)', () => {
    const list = buildNextWeekList({
      history: history({ breadcrumbs: { product: 'Golden Breadcrumbs', weeksAgo: [10, 6] } }), // usually every 4 weeks, last 6 weeks before the last order
      catalog: cat,
      meals: [meal('Thu', 'Schnitzel', ['breadcrumbs'])],
      target: TARGET,
      matches: MATCHES,
    })
    const line = lineFor(list, 'Thu', 'item:breadcrumbs')
    expect(line.ticked).toBe(true)
    expect(line.why).toMatch(/^Cupboard, but likely out: usually every 4 weeks, last bought 7 weeks ago$/)
  })

  it('leaves a cupboard ingredient bought only once unticked, "check"', () => {
    const list = buildNextWeekList({ history: h, catalog: cat, meals: [meal('Wed', 'Keema', ['single spice'])], target: TARGET, matches: MATCHES })
    expect(lineFor(list, 'Wed', 'item:single spice')).toMatchObject({ ticked: false, why: expect.stringContaining('check') })
  })

  it('shows an ingredient saved as "not bought" as its plain name, unticked, without "check"', () => {
    const list = buildNextWeekList({ history: h, catalog: cat, meals: [meal('Fri', 'Tacos', ['Smoked Paprika'])], target: TARGET, matches: MATCHES })
    const line = list.meals[0].lines[0]
    expect(line).toMatchObject({ label: 'Smoked Paprika', ticked: false, match: 'none', why: 'Not one of your usual items' })
  })

  it('shows an unsure ingredient as its plain name, unticked, "check"', () => {
    const list = buildNextWeekList({ history: h, catalog: cat, meals: [meal('Fri', 'Tacos', ['mystery'])], target: TARGET, matches: MATCHES })
    expect(list.meals[0].lines[0]).toMatchObject({ label: 'mystery', ticked: false, match: 'check', why: 'Not sure which product, check' })
  })

  it('treats a name with no saved answer yet like an unsure one', () => {
    const list = buildNextWeekList({ history: h, catalog: cat, meals: [meal('Fri', 'Tacos', ['brand new thing'])], target: TARGET, matches: MATCHES })
    expect(list.meals[0].lines[0]).toMatchObject({ match: 'check', ticked: false })
  })

  it('never word-matches: an ingredient with no saved answer does not take a similar item', () => {
    const list = buildNextWeekList({ history: h, catalog: cat, meals: [meal('Fri', 'Tacos', ['salmon pie filling'])], target: TARGET, matches: MATCHES })
    expect(list.meals[0].lines[0].item).toBeUndefined()
    expect(list.meals[0].lines[0].match).toBe('check')
  })

  it('keeps every recipe wording on the line, for the fix button', () => {
    const list = buildNextWeekList({ history: h, catalog: cat, meals: [meal('Mon', 'A', ['salmon']), meal('Thu', 'B', ['salmon fillets'])], target: TARGET, matches: MATCHES })
    expect(lineFor(list, 'Mon', 'item:salmon')).toMatchObject({ ingredients: ['salmon', 'salmon fillets'], match: 'matched' })
  })

  it('says "Fresh" only for fresh aisles: other items say "For Tue"', () => {
    const sweets = history({ sweets: { product: 'Fruit Gums', weeksAgo: [2] }, salmon: { product: 'Salmon Fillets x4', weeksAgo: [3] } })
    const list = buildNextWeekList({
      history: sweets,
      catalog: catalog([], { sweets: 'Drinks and snacks', salmon: 'Fish' }),
      meals: [meal('Tue', 'Party', ['sweets', 'salmon'])],
      target: TARGET,
      matches: MATCHES,
    })
    expect(lineFor(list, 'Tue', 'item:sweets')).toMatchObject({ ticked: true, why: 'For Tue' })
    expect(lineFor(list, 'Tue', 'item:salmon')).toMatchObject({ ticked: true, why: 'Fresh, for Tue' })
  })

  describe('cupboard rule', () => {
    // Usually bought every 4 weeks; the target is 1 week after the last order of the history
    const line = (lastWeeksAgo: number) =>
      lineFor(
        buildNextWeekList({ history: history({ pasta: { product: 'Fusilli 1kg', weeksAgo: [lastWeeksAgo + 4, lastWeeksAgo] } }), catalog: cat, meals: [meal('Mon', 'Pasta', ['pasta'])], target: TARGET, matches: MATCHES }),
        'Mon',
        'item:pasta'
      )

    it('stays ticked as "likely out" between 1.5x and 2x the usual gap', () => {
      expect(line(6)).toMatchObject({ ticked: true, why: expect.stringContaining('likely out') }) // 7 weeks ago: 1.75x
    })

    it('is unticked with "Not bought for a long time, check" past 2x the usual gap', () => {
      expect(line(8)).toMatchObject({ ticked: false, why: 'Not bought for a long time, check' }) // 9 weeks ago: 2.25x
    })

    it('is unticked as "probably have" within 1.5x', () => {
      expect(line(1)).toMatchObject({ ticked: false, why: expect.stringContaining('probably have') })
    })
  })

  it('makes one line for an item two meals need: "for Mon + Thu"', () => {
    const list = buildNextWeekList({
      history: h,
      catalog: cat,
      meals: [meal('Mon', 'A', ['salmon']), meal('Thu', 'B', ['salmon fillets'])],
      target: TARGET,
      matches: MATCHES,
    })
    const real = list.meals.flatMap(m => m.lines).filter(l => !l.greyed && l.item === 'salmon')
    expect(real).toHaveLength(1)
    expect(real[0].why).toBe('Fresh, for Mon + Thu')
    expect(list.meals[1].lines[0]).toMatchObject({ greyed: true, why: 'see Mon', ticked: false })
  })

  it('removes an item a meal needs from "do you need these?" and greys it in the usual items', () => {
    const weekly = history({ eggs: { product: 'Free Range Eggs x12', weeksAgo: [0, 1, 2, 3, 4, 5, 6, 7, 8] }, hummus: { product: 'Houmous', weeksAgo: [0, 1, 2, 3, 4, 5, 6] } })
    const without = buildNextWeekList({ history: weekly, catalog: catalog(), meals: [], target: TARGET, matches: MATCHES })
    expect(without.maybe.map(m => m.item)).toContain('hummus')

    const withMeal = buildNextWeekList({ history: weekly, catalog: catalog(), meals: [meal('Tue', 'Fajitas', ['eggs']), meal('Wed', 'X', ['hummus'])], target: TARGET, matches: MATCHES })
    expect(withMeal.maybe.map(m => m.item)).not.toContain('hummus')
    const usualEggs = withMeal.usual.flatMap(g => g.lines).find(l => l.item === 'eggs')!
    expect(usualEggs).toMatchObject({ greyed: true, why: 'see Tue', ticked: false })
    expect(lineFor(withMeal, 'Tue', 'item:eggs').ticked).toBe(true)
  })
})

describe('ticks and copy', () => {
  const h = history({ eggs: { product: 'Free Range Eggs x12', weeksAgo: [0, 1, 2, 3, 4, 5, 6, 7, 8] }, hummus: { product: 'Houmous', weeksAgo: [0, 1, 2, 3, 4, 5, 6] }, salmon: { product: 'Salmon Fillets x4', weeksAgo: [3] } })

  it('copies one product name per ticked line, nothing unticked or greyed', () => {
    const list = buildNextWeekList({ history: h, catalog: catalog(), meals: [meal('Mon', 'A', ['salmon', 'eggs', 'mystery'])], target: TARGET, matches: MATCHES })
    expect(copyText(list).split('\n').sort()).toEqual(['Free Range Eggs x12', 'Filler', 'Salmon Fillets x4'].sort())
    expect(tickedCount(list)).toBe(3)
  })

  it('applies ticks Ronen changed', () => {
    const list = buildNextWeekList({ history: h, catalog: catalog(), meals: [], target: TARGET, matches: MATCHES, overrides: { 'item:hummus': true, 'item:eggs': false } })
    expect(copyText(list).split('\n')).toContain('Houmous')
    expect(copyText(list).split('\n')).not.toContain('Free Range Eggs x12')
  })
})
