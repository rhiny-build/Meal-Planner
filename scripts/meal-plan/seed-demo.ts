/**
 * Local demo data for trying the meal-plan agent: ~30 recipes with types, tiers and kinds, four past weeks of plans
 * and a few day notes for next week. Local database only. Usage: npx tsx scripts/meal-plan/seed-demo.ts
 */
import { PrismaClient } from '@prisma/client'
import { addDays } from '../../lib/mealPlanAgent/dates'
import { formatDateParam, getWeekStart, parseDateParam } from '../../lib/dateUtils'

const prisma = new PrismaClient()

type R = { name: string; protein?: string; carb?: string; veg?: string; kind?: 'full' | 'quick'; tier?: string; prep?: string }
const RECIPES: R[] = [
  { name: 'Pan Fried Sea Bass', protein: 'fish', tier: 'favorite', prep: 'quick', kind: 'quick' },
  { name: 'Lemon Garlic Salmon', protein: 'fish', tier: 'favorite', prep: 'medium' },
  { name: 'Fish Finger Wraps', protein: 'fish', tier: 'non-regular', prep: 'quick', kind: 'quick' },
  { name: 'Oven Baked Chicken Schnitzel', protein: 'chicken', tier: 'favorite', prep: 'medium' },
  { name: 'Chicken Fajitas', protein: 'chicken', tier: 'favorite', prep: 'medium' },
  { name: 'Roast Chicken Thighs', protein: 'chicken', tier: 'favorite', prep: 'long' },
  { name: 'Chicken Stir Fry', protein: 'chicken', tier: 'non-regular', prep: 'quick', kind: 'quick' },
  { name: 'Beef Keema with Peas', protein: 'red-meat', tier: 'favorite', prep: 'medium' },
  { name: 'Burgers', protein: 'red-meat', tier: 'favorite', prep: 'quick', kind: 'quick' },
  { name: "Shini's Meatballs", protein: 'red-meat', tier: 'favorite', prep: 'long' },
  { name: 'Turkey Mince Bolognese', protein: 'red-meat', tier: 'non-regular', prep: 'medium' },
  { name: 'Sausage and Mash', protein: 'red-meat', tier: 'non-regular', prep: 'medium' },
  { name: 'Veggie Chilli', protein: 'vegetarian', tier: 'non-regular', prep: 'medium' },
  { name: 'Halloumi Wraps', protein: 'vegetarian', tier: 'new', prep: 'quick', kind: 'quick' },
  { name: 'Basmati Rice', carb: 'rice', tier: 'favorite', kind: 'quick' },
  { name: 'Israeli Couscous', carb: 'couscous', tier: 'favorite', kind: 'quick' },
  { name: 'Simple Fries', carb: 'fries', tier: 'favorite', kind: 'quick' },
  { name: 'Buttered Pasta', carb: 'pasta', tier: 'favorite', kind: 'quick' },
  { name: 'Mashed Potato', carb: 'other', tier: 'favorite', kind: 'quick' },
  { name: 'Garlic Bread', carb: 'other', tier: 'non-regular', kind: 'quick' },
  { name: 'Steamed Broccoli', veg: 'broccoli', tier: 'favorite', kind: 'quick' },
  { name: 'Green Beans', veg: 'beans', tier: 'favorite', kind: 'quick' },
  { name: 'Roasted Carrots', veg: 'carrots', tier: 'favorite', kind: 'quick' },
  { name: 'Peas and Sweetcorn', veg: 'peas', tier: 'favorite', kind: 'quick' },
  { name: 'Side Salad', veg: 'salad', tier: 'non-regular', kind: 'quick' },
  { name: 'Roasted Peppers', veg: 'peppers', tier: 'non-regular', kind: 'quick' },
]

async function main() {
  const ids = new Map<string, string>()
  for (const r of RECIPES) {
    const existing = await prisma.recipe.findFirst({ where: { name: r.name } })
    const recipe =
      existing ??
      (await prisma.recipe.create({
        data: {
          name: r.name, ingredients: 'see recipe', tier: r.tier ?? 'favorite', kind: r.kind ?? 'full', prepTime: r.prep ?? 'quick',
          proteinType: r.protein ?? null, carbType: r.carb ?? null, vegetableType: r.veg ?? null,
        },
      }))
    ids.set(r.name, recipe.id)
  }
  const proteins = RECIPES.filter(r => r.protein && r.kind !== 'quick' || r.protein)
  const carbs = RECIPES.filter(r => r.carb)
  const vegs = RECIPES.filter(r => r.veg)

  // Four past weeks (the weeks before the current one), a different dinner each day
  const thisWeek = formatDateParam(getWeekStart(new Date(), 1))
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  let n = 0
  for (let w = 4; w >= 1; w--) {
    const start = addDays(thisWeek, -7 * w)
    await prisma.mealPlan.deleteMany({ where: { date: { gte: parseDateParam(start), lt: parseDateParam(addDays(start, 7)) } } })
    for (let d = 0; d < 7; d++) {
      await prisma.mealPlan.create({
        data: {
          date: parseDateParam(addDays(start, d)), dayOfWeek: dayNames[d],
          proteinRecipeId: ids.get(proteins[n % proteins.length].name),
          carbRecipeId: ids.get(carbs[n % carbs.length].name),
          vegetableRecipeId: ids.get(vegs[n % vegs.length].name),
        },
      })
      n += 1
    }
  }

  // Notes for next week (Monday 19 Oct style: relative to this week)
  const next = addDays(thisWeek, 7)
  const note = (offset: number, text: string) =>
    prisma.dayNote.upsert({ where: { date: new Date(`${addDays(next, offset)}T00:00:00.000Z`) }, create: { date: new Date(`${addDays(next, offset)}T00:00:00.000Z`), text }, update: { text } })
  await note(1, 'football till 7')
  await note(3, 'out')
  console.log(`Seeded ${RECIPES.length} recipes, 4 past weeks, notes for ${next}`)
}
main().finally(() => prisma.$disconnect())
