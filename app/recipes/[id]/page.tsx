/**
 * Recipe Page (Server Component)
 *
 * One recipe in the book as three flippable pages (Overview, Ingredients,
 * Method). Loads the recipe and hands plain data to the client pages; Edit
 * stays in the header.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getProteinOptions, getCarbOptions } from '@/lib/dishTypeConfig'
import { getCookIngredients } from '@/lib/cook/getCookIngredients'
import RecipePages from './RecipePages'
import RecipeActions from './RecipeActions'
import { getRecipeOverview } from './recipeOverview'

export const dynamic = 'force-dynamic'

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      structuredIngredients: { orderBy: { order: 'asc' } },
      steps: { orderBy: { order: 'asc' } },
    },
  })
  if (!recipe) notFound()

  const [proteinOptions, carbOptions] = await Promise.all([
    getProteinOptions(),
    getCarbOptions(),
  ])

  return (
    <div className="max-w-xl md:max-w-2xl mx-auto px-4 pt-5 pb-4">
      <header className="flex items-center gap-3 pb-3">
        <Link
          href="/recipes"
          aria-label="Back to recipes"
          className="w-11 h-11 flex-none rounded-card bg-surface text-ink flex items-center justify-center"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="font-display text-xl font-bold leading-tight flex-1" data-testid="recipe-title">
          {recipe.name}
        </h1>
        <RecipeActions
          recipe={recipe}
          proteinOptions={proteinOptions}
          carbOptions={carbOptions}
        />
      </header>

      <RecipePages
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
        overview={getRecipeOverview(recipe)}
      />
    </div>
  )
}
