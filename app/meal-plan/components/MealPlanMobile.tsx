/**
 * MealPlanMobile Component
 *
 * Mobile-optimized meal plan view showing one day at a time.
 * Users navigate between days using prev/next arrows or day indicator dots.
 * Read-only view - editing is desktop only.
 */

'use client'

import { useState } from 'react'
import type { RecipeWithIngredients, WeekPlan } from '@/types'

interface MealPlanMobileProps {
  weekPlan: WeekPlan[]
  lunchRecipes: RecipeWithIngredients[]
  proteinRecipes: RecipeWithIngredients[]
  carbRecipes: RecipeWithIngredients[]
  vegetableRecipes: RecipeWithIngredients[]
}

// Color styles matching desktop MealPlanDrawer
const colorStyles = {
  lunch: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
  },
  protein: {
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20',
    border: 'border-fuchsia-500',
    text: 'text-fuchsia-700 dark:text-fuchsia-400',
  },
  carb: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    border: 'border-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-400',
  },
  vegetable: {
    bg: 'bg-lime-50 dark:bg-lime-900/20',
    border: 'border-lime-500',
    text: 'text-lime-700 dark:text-lime-400',
  },
}

interface MealCardProps {
  label: string
  recipe: RecipeWithIngredients | undefined
  colorClass: typeof colorStyles.lunch
}

function MealCard({ label, recipe, colorClass }: MealCardProps) {
  if (!recipe) {
    return (
      <div className="px-4 py-4 border-b border-gray-100 dark:border-neutral-700 last:border-b-0">
        <div className="text-xs text-gray-400 dark:text-neutral-500 uppercase tracking-wide mb-1">
          {label}
        </div>
        <div className="text-gray-400 dark:text-neutral-500 italic">
          Not selected
        </div>
      </div>
    )
  }

  return (
    <div className={`px-4 py-4 border-l-4 ${colorClass.border} ${colorClass.bg}`}>
      <div className="text-xs text-gray-500 dark:text-neutral-400 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className={`text-lg ${colorClass.text}`}>
        {recipe.recipeUrl ? (
          <a
            href={recipe.recipeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {recipe.name}
          </a>
        ) : (
          recipe.name
        )}
      </div>
    </div>
  )
}

export default function MealPlanMobile({
  weekPlan,
  lunchRecipes,
  proteinRecipes,
  carbRecipes,
  vegetableRecipes,
}: MealPlanMobileProps) {
  const [currentDay, setCurrentDay] = useState(0)

  // Helper to find recipe by ID
  const findRecipe = (
    recipes: RecipeWithIngredients[],
    recipeId: string
  ): RecipeWithIngredients | undefined => {
    if (!recipeId) return undefined
    return recipes.find((r) => r.id === recipeId)
  }

  // Get current day's data
  const dayPlan = weekPlan[currentDay]
  const dayName = dayPlan?.day || ''
  const dayDate = dayPlan?.date
    ? new Date(dayPlan.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  // Find recipes for current day
  const lunchRecipe = findRecipe(lunchRecipes, dayPlan?.lunchRecipeId)
  const proteinRecipe = findRecipe(proteinRecipes, dayPlan?.proteinRecipeId)
  const carbRecipe = findRecipe(carbRecipes, dayPlan?.carbRecipeId)
  const vegetableRecipe = findRecipe(vegetableRecipes, dayPlan?.vegetableRecipeId)

  return (
    <div className="py-4">
      {/* Day Indicator Dots */}
      <div className="flex justify-center gap-2 mb-4">
        {weekPlan.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentDay(index)}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              index === currentDay
                ? 'bg-blue-600 dark:bg-blue-500'
                : 'bg-gray-300 dark:bg-neutral-600'
            }`}
            aria-label={`Go to ${weekPlan[index]?.day}`}
          />
        ))}
      </div>

      {/* Current Day Card */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md overflow-hidden">
        {/* Day Header with Navigation */}
        <div className="bg-blue-600 dark:bg-blue-700 px-4 py-3">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentDay(Math.max(0, currentDay - 1))}
              disabled={currentDay === 0}
              className="p-2 text-white disabled:opacity-30 transition-opacity"
              aria-label="Previous day"
            >
              ← Prev
            </button>
            <div className="text-center">
              <div className="font-bold text-white text-lg">{dayName}</div>
              <div className="text-blue-100 text-sm">{dayDate}</div>
            </div>
            <button
              onClick={() => setCurrentDay(Math.min(weekPlan.length - 1, currentDay + 1))}
              disabled={currentDay === weekPlan.length - 1}
              className="p-2 text-white disabled:opacity-30 transition-opacity"
              aria-label="Next day"
            >
              Next →
            </button>
          </div>
        </div>

        {/* Meals */}
        <div className="divide-y divide-gray-100 dark:divide-neutral-700">
          <MealCard label="Lunch" recipe={lunchRecipe} colorClass={colorStyles.lunch} />
          <MealCard label="Protein" recipe={proteinRecipe} colorClass={colorStyles.protein} />
          <MealCard label="Carb" recipe={carbRecipe} colorClass={colorStyles.carb} />
          <MealCard label="Vegetable" recipe={vegetableRecipe} colorClass={colorStyles.vegetable} />
        </div>
      </div>

      {/* Navigation hint */}
      <p className="text-center text-sm text-gray-500 dark:text-neutral-400 mt-4">
        Tap the arrows or dots to navigate between days
      </p>
    </div>
  )
}
