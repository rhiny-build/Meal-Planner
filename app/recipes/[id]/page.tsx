/**
 * Recipe Page (Server Component)
 *
 * One recipe in the book: description, servings, time, ingredients,
 * method (only when there is one), notes and source link.
 */

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getProteinOptions, getCarbOptions } from '@/lib/dishTypeConfig'
import { formatIngredient } from '@/lib/ingredientHelpers'
import RecipeMethod from './RecipeMethod'
import RecipeActions from './RecipeActions'

export const dynamic = 'force-dynamic'

function formatTotalTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

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

  const meta = [
    recipe.servings ? `Serves ${recipe.servings}` : null,
    recipe.totalTimeMinutes ? formatTotalTime(recipe.totalTimeMinutes) : null,
  ].filter(Boolean)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/recipes" className="text-sm text-blue-600 dark:text-fuchsia-400 hover:underline">
        &larr; Recipe book
      </Link>

      <header className="mt-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-bold" data-testid="recipe-title">
            {recipe.name}
          </h1>
          {recipe.kind === 'quick' && (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Quick
            </span>
          )}
        </div>
        {recipe.description && (
          <p className="mt-2 text-gray-700 dark:text-gray-300">{recipe.description}</p>
        )}
        {meta.length > 0 && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400" data-testid="recipe-meta">
            {meta.join(' · ')}
          </p>
        )}
        <RecipeActions
          recipe={recipe}
          proteinOptions={proteinOptions}
          carbOptions={carbOptions}
        />
      </header>

      <section className="mb-8" aria-labelledby="ingredients-heading">
        <h2 id="ingredients-heading" className="text-xl font-semibold mb-2">
          Ingredients
        </h2>
        {recipe.structuredIngredients.length > 0 ? (
          <ul className="list-disc list-inside space-y-1" data-testid="ingredient-list">
            {recipe.structuredIngredients.map((ing) => (
              <li key={ing.id}>{formatIngredient(ing)}</li>
            ))}
          </ul>
        ) : (
          <p className="whitespace-pre-line">{recipe.ingredients}</p>
        )}
      </section>

      <RecipeMethod steps={recipe.steps} ingredients={recipe.structuredIngredients} />

      {recipe.notes && (
        <section className="mb-8" aria-labelledby="notes-heading">
          <h2 id="notes-heading" className="text-xl font-semibold mb-2">
            Notes
          </h2>
          <p className="whitespace-pre-line text-gray-800 dark:text-gray-200">{recipe.notes}</p>
        </section>
      )}

      {recipe.recipeUrl && (
        <p className="text-sm">
          Source:{' '}
          <a
            href={recipe.recipeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-fuchsia-400 hover:underline break-all"
          >
            {recipe.recipeUrl}
          </a>
        </p>
      )}
    </div>
  )
}
