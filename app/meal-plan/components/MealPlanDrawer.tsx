/**
 * MealPlanDrawer Component
 *
 * Expandable drawer showing ingredient details for a day's meals.
 * Uses Radix Collapsible for smooth animation.
 */

'use client'

import * as Collapsible from '@radix-ui/react-collapsible'
import type { RecipeWithIngredients } from '@/types'

interface MealPlanDrawerProps {
  isOpen: boolean
  lunchRecipe?: RecipeWithIngredients | null
  proteinRecipe?: RecipeWithIngredients | null
  carbRecipe?: RecipeWithIngredients | null
  vegetableRecipe?: RecipeWithIngredients | null
}

interface RecipeCardProps {
  recipe: RecipeWithIngredients
  label: string
  colorClass: {
    bg: string
    border: string
    text: string
  }
}

function RecipeCard({ recipe, label, colorClass }: RecipeCardProps) {
  const ingredients = recipe.structuredIngredients || []

  return (
    <div className={`${colorClass.bg} p-4 rounded-lg border-l-4 ${colorClass.border}`}>
      <div className={`font-semibold ${colorClass.text} mb-2`}>
        {label}:{' '}
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
      {ingredients.length > 0 ? (
        <ul className="text-sm text-gray-600 dark:text-neutral-400 list-disc ml-4 space-y-1">
          {ingredients.map((ing) => (
            <li key={ing.id}>
              {ing.quantity && <span>{ing.quantity} </span>}
              {ing.unit && <span>{ing.unit} </span>}
              <span>{ing.name}</span>
              {ing.notes && <span className="text-gray-400 dark:text-neutral-500"> ({ing.notes})</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400 dark:text-neutral-500 italic">No ingredients listed</p>
      )}
    </div>
  )
}

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

export default function MealPlanDrawer({
  isOpen,
  lunchRecipe,
  proteinRecipe,
  carbRecipe,
  vegetableRecipe,
}: MealPlanDrawerProps) {
  const hasAnyRecipe = lunchRecipe || proteinRecipe || carbRecipe || vegetableRecipe

  return (
    <Collapsible.Content className="col-span-7 overflow-hidden data-[state=open]:animate-slideDown data-[state=closed]:animate-slideUp">
      <div className="bg-gray-50 dark:bg-neutral-800/50 border-t border-gray-200 dark:border-neutral-700 px-5 py-4">
        {hasAnyRecipe ? (
          <div className="grid grid-cols-4 gap-4">
            {lunchRecipe ? (
              <RecipeCard recipe={lunchRecipe} label="Lunch" colorClass={colorStyles.lunch} />
            ) : (
              <div className="p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg text-gray-400 dark:text-neutral-500 text-sm italic">
                No lunch selected
              </div>
            )}
            {proteinRecipe ? (
              <RecipeCard recipe={proteinRecipe} label="Protein" colorClass={colorStyles.protein} />
            ) : (
              <div className="p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg text-gray-400 dark:text-neutral-500 text-sm italic">
                No protein selected
              </div>
            )}
            {carbRecipe ? (
              <RecipeCard recipe={carbRecipe} label="Carb" colorClass={colorStyles.carb} />
            ) : (
              <div className="p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg text-gray-400 dark:text-neutral-500 text-sm italic">
                No carb selected
              </div>
            )}
            {vegetableRecipe ? (
              <RecipeCard recipe={vegetableRecipe} label="Vegetable" colorClass={colorStyles.vegetable} />
            ) : (
              <div className="p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg text-gray-400 dark:text-neutral-500 text-sm italic">
                No vegetable selected
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-400 dark:text-neutral-500 text-sm italic text-center py-4">
            No meals selected for this day
          </p>
        )}
      </div>
    </Collapsible.Content>
  )
}
