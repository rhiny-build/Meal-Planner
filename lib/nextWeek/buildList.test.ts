import { describe, expect, it } from 'vitest'
import { buildNextWeekList, copyText, tickedCount, type ItemInfo, type MealInput } from './buildList'
import { buildHistory, type PurchaseLine } from './predict'

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
const catalog = (cupboardItems: string[] = []) => {
  const map = new Map<string, ItemInfo>()
  return new Proxy(map, {
    get: (target, prop, receiver) =>
      prop === 'get' ? (item: string) => ({ aisle: cupboardItems.includes(item) ? 'Cupboard' : 'Fresh produce', cupboard: cupboardItems.includes(item) }) : Reflect.get(target, prop, receiver),
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
    const list = buildNextWeekList({ history: h, catalog: cat, meals: [meal('Mon', 'Salmon Pasta', ['salmon fillets'])], target: TARGET })
    const line = lineFor(list, 'Mon', 'item:salmon')
    expect(line).toMatchObject({ label: 'Salmon Fillets x4', ticked: true, why: 'Fresh, for Mon' })
  })

  it('leaves a cupboard ingredient unticked while it is within 1.5x its usual gap', () => {
    const list = buildNextWeekList({ history: h, catalog: cat, meals: [meal('Mon', 'Pasta', ['pasta'])], target: TARGET })
    const line = lineFor(list, 'Mon', 'item:pasta')
    expect(line.ticked).toBe(false)
    expect(line.why).toMatch(/^Cupboard: Fusilli 1kg bought .*probably have$/)
  })

  it('ticks a cupboard ingredient that is likely out (more than 1.5x its usual gap)', () => {
    const list = buildNextWeekList({
      history: history({ breadcrumbs: { product: 'Golden Breadcrumbs', weeksAgo: [11, 10, 9] } }), // usually every week, last 9 weeks before the last order
      catalog: cat,
      meals: [meal('Thu', 'Schnitzel', ['breadcrumbs'])],
      target: TARGET,
    })
    const line = lineFor(list, 'Thu', 'item:breadcrumbs')
    expect(line.ticked).toBe(true)
    expect(line.why).toMatch(/^Cupboard, but likely out: usually every week, last bought 10 weeks ago$/)
  })

  it('leaves a cupboard ingredient bought only once unticked, "check"', () => {
    const list = buildNextWeekList({ history: h, catalog: cat, meals: [meal('Wed', 'Keema', ['single spice'])], target: TARGET })
    expect(lineFor(list, 'Wed', 'item:single spice')).toMatchObject({ ticked: false, why: expect.stringContaining('check') })
  })

  it('shows an ingredient with no matching item as its plain name, unticked, "check"', () => {
    const list = buildNextWeekList({ history: h, catalog: cat, meals: [meal('Fri', 'Tacos', ['smoked paprika'])], target: TARGET })
    const line = list.meals[0].lines[0]
    expect(line).toMatchObject({ label: 'smoked paprika', ticked: false })
    expect(line.why).toContain('check')
  })

  it('makes one line for an item two meals need: "for Mon + Thu"', () => {
    const list = buildNextWeekList({
      history: h,
      catalog: cat,
      meals: [meal('Mon', 'A', ['salmon']), meal('Thu', 'B', ['salmon fillets'])],
      target: TARGET,
    })
    const real = list.meals.flatMap(m => m.lines).filter(l => !l.greyed && l.item === 'salmon')
    expect(real).toHaveLength(1)
    expect(real[0].why).toBe('Fresh, for Mon + Thu')
    expect(list.meals[1].lines[0]).toMatchObject({ greyed: true, why: 'see Mon', ticked: false })
  })

  it('removes an item a meal needs from "do you need these?" and greys it in the usual items', () => {
    const weekly = history({ eggs: { product: 'Free Range Eggs x12', weeksAgo: [0, 1, 2, 3, 4, 5, 6, 7, 8] }, hummus: { product: 'Houmous', weeksAgo: [0, 1, 2, 3, 4, 5, 6] } })
    const without = buildNextWeekList({ history: weekly, catalog: catalog(), meals: [], target: TARGET })
    expect(without.maybe.map(m => m.item)).toContain('hummus')

    const withMeal = buildNextWeekList({ history: weekly, catalog: catalog(), meals: [meal('Tue', 'Fajitas', ['eggs']), meal('Wed', 'X', ['hummus'])], target: TARGET })
    expect(withMeal.maybe.map(m => m.item)).not.toContain('hummus')
    const usualEggs = withMeal.usual.flatMap(g => g.lines).find(l => l.item === 'eggs')!
    expect(usualEggs).toMatchObject({ greyed: true, why: 'see Tue', ticked: false })
    expect(lineFor(withMeal, 'Tue', 'item:eggs').ticked).toBe(true)
  })
})

describe('ticks and copy', () => {
  const h = history({ eggs: { product: 'Free Range Eggs x12', weeksAgo: [0, 1, 2, 3, 4, 5, 6, 7, 8] }, hummus: { product: 'Houmous', weeksAgo: [0, 1, 2, 3, 4, 5, 6] }, salmon: { product: 'Salmon Fillets x4', weeksAgo: [3] } })

  it('copies one product name per ticked line, nothing unticked or greyed', () => {
    const list = buildNextWeekList({ history: h, catalog: catalog(), meals: [meal('Mon', 'A', ['salmon', 'eggs', 'mystery'])], target: TARGET })
    expect(copyText(list).split('\n').sort()).toEqual(['Free Range Eggs x12', 'Filler', 'Salmon Fillets x4'].sort())
    expect(tickedCount(list)).toBe(3)
  })

  it('applies ticks Ronen changed', () => {
    const list = buildNextWeekList({ history: h, catalog: catalog(), meals: [], target: TARGET, overrides: { 'item:hummus': true, 'item:eggs': false } })
    expect(copyText(list).split('\n')).toContain('Houmous')
    expect(copyText(list).split('\n')).not.toContain('Free Range Eggs x12')
  })
})
