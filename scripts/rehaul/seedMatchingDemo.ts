/**
 * Seeds a local database with a safe, made-up shop history and a planned week, to try ingredient matching:
 * 12 weekly orders of the generic items in tests/fixtures/matching/cases.json, and five recipes planned for
 * next week that use every row of the table in docs/rehaul/sessions/RUN-ingredient-matching.md.
 *   npx tsx scripts/rehaul/seedMatchingDemo.ts            # local database only
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { nextWeekStart } from '@/lib/nextWeek/loadNextWeek'
import type { CaseSet } from '@/lib/nextWeek/scoreMatching'

export const DEMO_RECIPES: { name: string; day: string; ingredients: string[] }[] = [
  { name: 'Chicken Fajita Wraps', day: 'Monday', ingredients: ['Chicken strips', 'El Paso Tortilla Kit', 'Sweet Corn', 'Grated Mozzarela', 'Red Pepper'] },
  { name: 'Turkey Pasta Bake', day: 'Tuesday', ingredients: ['Ground Turkey', 'Garlic powder', 'pasta', 'Tomato Puree', 'Dressing'] },
  { name: 'Burger Night', day: 'Wednesday', ingredients: ['Burgers', 'Mayo', 'Fries', 'Lettuce', 'Burger Buns'] },
  { name: 'Salmon and Rice', day: 'Thursday', ingredients: ['salmon fillet', 'Rice', 'Soy sauce', 'Fresh ginger', 'Saffron'] },
  { name: 'Halloumi Salad', day: 'Friday', ingredients: ['Hallumi', 'Cucumber', 'Cherry Tomatoes', 'olive oil', 'Fresh herbs'] },
]

async function main() {
  const prisma = new PrismaClient()
  const caseSet: CaseSet = JSON.parse(readFileSync(path.resolve(__dirname, '../../tests/fixtures/matching/cases.json'), 'utf8'))

  await prisma.systemSetting.upsert({ where: { key: 'weekStartDay' }, update: { value: '1' }, create: { key: 'weekStartDay', value: '1' } })

  // 12 weekly orders, delivered on Tuesdays, the latest on 27 Oct 2026. An item is in as many of the latest orders as it has `bought`.
  const lastOrder = Date.UTC(2026, 9, 27)
  const orders = Array.from({ length: 12 }, (_, i) => new Date(lastOrder - (11 - i) * 7 * 86400000))
  await prisma.purchaseHistory.deleteMany({ where: { orderNumber: { startsWith: 'DEMO-' } } })
  await prisma.productMapping.deleteMany({ where: { productName: { startsWith: 'Demo ' } } })
  const mappings = caseSet.items.map(i => ({
    productName: `Demo ${i.item}`, itemName: i.item, aisle: i.aisle, cupboard: i.aisle === 'Cupboard',
  }))
  await prisma.productMapping.createMany({ data: mappings })
  const rows = orders.flatMap((date, o) => {
    const inOrder = caseSet.items.filter(i => 12 - o <= Math.min(i.bought, 12))
    return inOrder.map((i, lineIndex) => ({
      rawName: `Demo ${i.item}`, purchaseDate: date, source: 'receipt_upload', orderNumber: `DEMO-${o + 1}`, lineIndex,
    }))
  })
  await prisma.purchaseHistory.createMany({ data: rows })

  const start = nextWeekStart(new Date(), 1)
  start.setHours(0, 0, 0, 0)
  await prisma.mealPlan.deleteMany({ where: { date: { gte: start, lt: new Date(start.getTime() + 7 * 86400000) } } })
  await prisma.recipe.deleteMany({ where: { name: { in: DEMO_RECIPES.map(r => r.name) } } })
  for (const [index, r] of DEMO_RECIPES.entries()) {
    const recipe = await prisma.recipe.create({
      data: {
        name: r.name, tier: 'favorite', ingredients: r.ingredients.join('\n'),
        structuredIngredients: { create: r.ingredients.map((name, order) => ({ name, order })) },
      },
    })
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    await prisma.mealPlan.create({ data: { date, dayOfWeek: r.day, proteinRecipeId: recipe.id } })
  }
  console.log(`Seeded ${orders.length} orders, ${rows.length} lines, ${DEMO_RECIPES.length} recipes for the week of ${start.toDateString()}`)
  await prisma.$disconnect()
}

if (require.main === module) main()
