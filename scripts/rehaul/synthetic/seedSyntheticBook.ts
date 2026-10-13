/**
 * SYNTHETIC DATA seeder for the S07 backfill rehearsal. NOT part of prisma/seed.ts.
 *
 * Builds a 78-recipe book shaped like the real one (see data.ts) plus five weeks of meal plans,
 * two of which point at a duplicate recipe, so a merge can be shown preserving MealPlan references.
 *
 *   DATABASE_URL=postgresql://mp:mp@localhost:5432/mp_s07 \
 *     npx tsx scripts/rehaul/synthetic/seedSyntheticBook.ts --reset
 *
 * Safety: refuses to run unless the database host is localhost, and --reset DELETES every recipe and
 * meal plan in that database first.
 */

import { PrismaClient } from '@prisma/client'
import { parseAmount } from '../../../lib/ingredientAmount'
import { FAMILY_RECIPES, QUICK_ITEMS, URL_RECIPES } from './data'

const BASE = process.env.FIXTURE_BASE_URL ?? `http://localhost:${process.env.FIXTURE_PORT ?? 4466}`

/** "4 cloves garlic" -> { quantity: "4", unit: "cloves", name: "garlic" }. No leading number -> name only. */
export function splitIngredientLine(line: string) {
  const m = line.match(/^(\d+(?:\.\d+)?)\s*(kg|g|ml|l|litre|tbsp|tsp|cups?|cloves?|large|small)?\s+(.+)$/i)
  if (!m) return { quantity: null, unit: null, name: line }
  return { quantity: m[1], unit: m[2] ?? null, name: m[3] }
}

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? ''
  const host = (() => { try { return new URL(dbUrl).hostname } catch { return '' } })()
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error(`Refusing to seed synthetic data into "${host || 'unknown host'}": local databases only.`)
  }
  const prisma = new PrismaClient()
  try {
    const existing = await prisma.recipe.count()
    if (existing > 0 && !process.argv.includes('--reset')) {
      throw new Error(`The database already has ${existing} recipes. Pass --reset to delete all recipes and meal plans first.`)
    }
    await prisma.mealPlan.deleteMany()
    await prisma.recipe.deleteMany()

    const create = async (data: {
      name: string
      lines: string[]
      url?: string | null
      servings?: number | null
      notes?: string | null
      protein?: string | null
      carb?: string | null
      noQuantities?: boolean
      steps?: string[]
      tier?: string
    }) => {
      const parts = data.lines.map((l) => {
        const p = splitIngredientLine(l)
        return data.noQuantities ? { quantity: null, unit: null, name: p.name } : p
      })
      return prisma.recipe.create({
        data: {
          name: data.name,
          ingredients: parts.map((p) => [p.quantity, p.unit, p.name].filter(Boolean).join(' ')).join('\n'),
          recipeUrl: data.url ?? null,
          servings: data.servings ?? null,
          notes: data.notes ?? null,
          proteinType: data.protein ?? null,
          carbType: data.carb ?? null,
          tier: data.tier ?? 'non-regular',
          structuredIngredients: {
            create: parts.map((p, order) => ({
              name: p.name,
              quantity: p.quantity,
              unit: p.unit,
              amount: p.quantity ? parseAmount(p.quantity, p.unit).amount : null,
              order,
            })),
          },
          ...(data.steps?.length ? { steps: { create: data.steps.map((text, order) => ({ text, order })) } } : {}),
        },
      })
    }

    const byName = new Map<string, { id: string }[]>()
    const remember = (name: string, r: { id: string }) => byName.set(name, [...(byName.get(name) ?? []), r])

    let i = 0
    for (const r of URL_RECIPES) {
      const lines = r.book?.dropLastIngredient ? r.ingredients.slice(0, -1) : r.ingredients
      const row = await create({
        name: r.name,
        lines,
        url: `${BASE}/recipes/${r.slug}.html`,
        servings: r.book?.servings,
        notes: r.book?.notes,
        protein: r.protein,
        carb: r.carb,
        noQuantities: r.book?.noQuantities ?? i % 5 === 3, // some recipes were typed as names only
        steps: r.book?.steps,
        tier: i % 3 === 0 ? 'favorite' : 'non-regular',
      })
      remember(r.name, row)
      i++
    }
    for (const q of QUICK_ITEMS) remember(q.name, await create({ name: q.name, lines: q.ingredients, carb: q.carb, tier: 'favorite' }))
    for (const f of FAMILY_RECIPES) remember(f.name, await create({ name: f.name, lines: f.ingredients, protein: f.protein, carb: f.carb }))

    // Five weeks of dinners. Two sea bass copies and two cucumber salad copies are in use.
    const pick = (name: string, n = 0) => byName.get(name)![n].id
    const proteins = ['Lemon Garlic Chicken Thighs', 'Teriyaki Salmon', 'Honey Soy Chicken Drumsticks', 'Turkey Meatballs', 'Baked Cod with Tomatoes', 'Beef Burritos', 'Roast Chicken with Potatoes']
    const carbs = ['Simple Fries', 'Simple Steamed Rice', 'Simple Noodles', 'Simple Israeli Couscous', 'Simple Sweet Potatoes Fries']
    const monday = new Date(Date.UTC(2026, 8, 7))
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    let rows = 0
    for (let d = 0; d < 35; d++) {
      const date = new Date(monday.getTime() + d * 86_400_000)
      let protein = pick(proteins[d % proteins.length])
      if (d === 3 || d === 17) protein = pick('Pan Fried Sea Bass with Lemon Garlic Herb Sauce', 1) // the copy
      if (d === 10) protein = pick('Pan Fried Sea Bass with Lemon Garlic Herb Sauce', 0) // the original
      let vegetable: string | null = d % 4 === 0 ? pick('Air Fried Green Beans') : null
      if (d === 5) vegetable = pick('Easy Asian Cucumber Salad', 1) // the family copy (no link)
      if (d === 12) vegetable = pick('Easy Asian Cucumber Salad', 0)
      await prisma.mealPlan.create({
        data: { date, dayOfWeek: days[d % 7], proteinRecipeId: protein, carbRecipeId: pick(carbs[d % carbs.length]), vegetableRecipeId: vegetable },
      })
      rows++
    }

    console.log(`SYNTHETIC book seeded: ${await prisma.recipe.count()} recipes (${URL_RECIPES.length} with links, ${QUICK_ITEMS.length} quick-looking, ${FAMILY_RECIPES.length} family), ${rows} meal-plan days. Links point at ${BASE}.`)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exit(1)
  })
}
