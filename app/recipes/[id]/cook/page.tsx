/**
 * Cook Page (Server Component)
 *
 * Loads one recipe with its ingredients and steps and hands it to the
 * full-screen cook screen.
 */

import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCookIngredients } from '@/lib/cook/getCookIngredients'
import CookScreen from '@/components/cook/CookScreen'
import { measured } from '@/lib/timing/measure'

export const dynamic = 'force-dynamic'

async function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      structuredIngredients: { orderBy: { order: 'asc' } },
      steps: { orderBy: { order: 'asc' } },
    },
  })
  if (!recipe) notFound()

  return (
    <CookScreen
      recipe={{
        id: recipe.id,
        name: recipe.name,
        kind: recipe.kind,
        servings: recipe.servings,
        ingredients: getCookIngredients(recipe),
        steps: recipe.steps.map((step) => ({
          id: step.id,
          order: step.order,
          text: step.text,
          timerSeconds: step.timerSeconds,
        })),
      }}
    />
  )
}

export default measured('page', '/recipes/:id/cook', CookPage)
