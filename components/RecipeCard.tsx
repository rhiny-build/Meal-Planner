/**
 * Recipe Card Component
 *
 * One recipe in the book, kept short: name, kind, time and whether it has a
 * method. Tapping the card opens the recipe page; Cook jumps straight into
 * cook mode. Edit and Delete sit in a small "More" menu.
 */

import Link from 'next/link'
import type { RecipeWithIngredients } from '@/types'
import { getRecipeTimeLabel } from '@/lib/recipeTimeLabel'

interface RecipeCardProps {
  recipe: RecipeWithIngredients
  onEdit: (recipe: RecipeWithIngredients) => void
  onDelete: (id: string) => void
}

export default function RecipeCard({ recipe, onEdit, onDelete }: RecipeCardProps) {
  const stepCount = recipe.steps?.length ?? 0
  const isQuick = recipe.kind === 'quick'
  const timeLabel = getRecipeTimeLabel(recipe)

  return (
    <article
      className="bg-surface rounded-2xl pl-4 pr-2 py-2 flex items-center gap-2"
      data-testid="recipe-card"
      data-kind={isQuick ? 'quick' : 'full'}
    >
      <Link href={`/recipes/${recipe.id}`} className="flex-1 min-w-0 flex flex-col gap-0.5 py-2 min-h-11">
        <span className="font-semibold text-[16px] text-ink leading-snug">{recipe.name}</span>
        <span className="text-[13px] text-ink-soft flex flex-wrap items-center gap-x-2">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              isQuick ? 'bg-accent-soft text-ink' : 'bg-primary-soft text-primary'
            }`}
          >
            {isQuick ? 'Quick' : 'Full'}
          </span>
          {timeLabel && <span>{timeLabel}</span>}
          <span data-testid="method-indicator">
            {stepCount > 0 ? `Method · ${stepCount} ${stepCount === 1 ? 'step' : 'steps'}` : 'No method'}
          </span>
        </span>
      </Link>

      <Link
        href={`/recipes/${recipe.id}/cook`}
        className="flex-none min-h-11 px-4 inline-flex items-center rounded-card bg-primary text-white font-semibold"
        aria-label={`Cook ${recipe.name}`}
      >
        Cook
      </Link>

      <details className="relative flex-none">
        <summary
          className="list-none w-11 h-11 rounded-card text-ink-soft flex items-center justify-center cursor-pointer [&::-webkit-details-marker]:hidden"
          aria-label={`More for ${recipe.name}`}
        >
          <span aria-hidden="true" className="text-xl leading-none">
            &hellip;
          </span>
        </summary>
        <div className="absolute right-0 top-12 z-10 w-36 bg-surface border border-line rounded-card shadow-lg p-1 flex flex-col">
          <button type="button" className="min-h-11 px-3 text-left rounded-card hover:bg-ground font-semibold" onClick={() => onEdit(recipe)}>
            Edit
          </button>
          <button type="button" className="min-h-11 px-3 text-left rounded-card hover:bg-danger-soft font-semibold text-danger" onClick={() => onDelete(recipe.id)}>
            Delete
          </button>
        </div>
      </details>
    </article>
  )
}
