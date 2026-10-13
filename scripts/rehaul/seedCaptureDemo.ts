/**
 * Seeds two throwaway recipes for trying "Tell me as you go" locally: a keema with no method,
 * and a recipe that already has a method (capture must never be offered there).
 *   npx tsx scripts/rehaul/seedCaptureDemo.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const INGREDIENTS = ['beef mince', 'onion', 'garlic', 'garam masala', 'tinned tomatoes', 'peas']

async function main() {
  for (const [name, hasMethod] of [['Capture Demo Keema', false], ['Capture Demo With Method', true]] as const) {
    const recipe = await prisma.recipe.create({
      data: {
        name,
        tier: 'favorite',
        servings: 4,
        ingredients: INGREDIENTS.join('\n'),
        structuredIngredients: { create: INGREDIENTS.map((ingredient, order) => ({ name: ingredient, order })) },
        steps: hasMethod ? { create: [{ order: 0, text: 'Cook it.' }] } : undefined,
      },
    })
    console.log(name, recipe.id)
  }
}

main().finally(() => prisma.$disconnect())
