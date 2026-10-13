/**
 * RecipePages
 *
 * The recipe as three flippable pages: Overview, Ingredients and Method.
 * Tabs at the top, swipe left/right on the first two pages, and a button at
 * the bottom that moves on to the next page. The Method page is cook mode
 * embedded (one step at a time, timers); it stays mounted once opened so
 * running timers survive flipping back to Ingredients. The servings chosen on
 * the Ingredients page also scale the steps.
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import CookScreen from '@/components/cook/CookScreen'
import type { CookRecipeData } from '@/components/cook/cookTypes'
import { useSwipe } from '@/lib/cook/useSwipe'
import RecipeOverviewPage from './RecipeOverviewPage'
import RecipeIngredientsPage from './RecipeIngredientsPage'
import type { RecipeOverviewData } from './recipeOverview'

const PAGES = ['Overview', 'Ingredients', 'Method'] as const
type PageName = (typeof PAGES)[number]

const NEXT_LABEL: Record<PageName, string | null> = {
  Overview: 'Ingredients',
  Ingredients: 'Start cooking',
  Method: null,
}

interface RecipePagesProps {
  recipe: CookRecipeData
  overview: RecipeOverviewData
}

export default function RecipePages({ recipe, overview }: RecipePagesProps) {
  const [pageIndex, setPageIndex] = useState(0)
  const [hasOpenedMethod, setHasOpenedMethod] = useState(false)
  const [servings, setServings] = useState(recipe.servings ?? 1)

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(PAGES.length - 1, index))
    if (PAGES[clamped] === 'Method') setHasOpenedMethod(true)
    setPageIndex(clamped)
  }

  const page = PAGES[pageIndex]
  const pageSwipe = useSwipe({
    onSwipeLeft: () => goTo(pageIndex + 1),
    onSwipeRight: () => goTo(pageIndex - 1),
  })
  const nextLabel = NEXT_LABEL[page]

  return (
    <div className="flex flex-col gap-3.5">
      <div role="tablist" aria-label="Recipe pages" className="grid grid-cols-3 gap-1.5 bg-sunken p-1 rounded-card">
        {PAGES.map((name, index) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`recipe-tab-${name}`}
            aria-selected={index === pageIndex}
            aria-controls={`recipe-panel-${name}`}
            onClick={() => goTo(index)}
            className={`min-h-11 rounded-[11px] text-[15px] font-semibold ${
              index === pageIndex ? 'bg-surface text-ink' : 'text-ink-soft'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="recipe-panel-Overview"
        aria-labelledby="recipe-tab-Overview"
        hidden={page !== 'Overview'}
        className="bg-surface rounded-panel p-5 touch-pan-y"
        {...pageSwipe}
      >
        <RecipeOverviewPage overview={overview} />
      </div>

      <div
        role="tabpanel"
        id="recipe-panel-Ingredients"
        aria-labelledby="recipe-tab-Ingredients"
        hidden={page !== 'Ingredients'}
        className="bg-surface rounded-panel p-5 touch-pan-y"
        {...pageSwipe}
      >
        <RecipeIngredientsPage
          ingredients={recipe.ingredients}
          recipeServings={recipe.servings}
          servings={servings}
          onServingsChange={setServings}
        />
      </div>

      <div
        role="tabpanel"
        id="recipe-panel-Method"
        aria-labelledby="recipe-tab-Method"
        hidden={page !== 'Method'}
        className="bg-surface rounded-panel p-4 min-h-[26rem] flex-col data-[active=true]:flex"
        data-active={page === 'Method'}
      >
        <div className="flex justify-end pb-1">
          <Link
            href={`/recipes/${recipe.id}/cook`}
            className="min-h-11 inline-flex items-center px-3 text-sm font-semibold text-primary"
            data-testid="cook-button"
          >
            Full screen
          </Link>
        </div>
        {hasOpenedMethod && (
          <CookScreen
            recipe={recipe}
            isEmbedded
            servings={servings}
            onServingsChange={setServings}
            isActive={page === 'Method'}
          />
        )}
      </div>

      {nextLabel && (
        <button
          type="button"
          onClick={() => goTo(pageIndex + 1)}
          className="min-h-14 rounded-card bg-primary text-white text-[17px] font-semibold"
        >
          {nextLabel}
        </button>
      )}
    </div>
  )
}
