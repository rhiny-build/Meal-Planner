/**
 * RecipeOverviewPage
 *
 * First page of the recipe: time / serves / steps tiles, the description,
 * tags, notes and the source link.
 */

import type { RecipeOverviewData } from './recipeOverview'

const tileClass = 'bg-ground rounded-card p-3 flex flex-col gap-0.5'

export default function RecipeOverviewPage({ overview }: { overview: RecipeOverviewData }) {
  return (
    <div className="flex flex-col gap-4" data-testid="recipe-overview">
      <div className="grid grid-cols-3 gap-2" data-testid="recipe-meta">
        <div className={tileClass}>
          <span className="text-xs text-ink-soft">Time</span>
          <span className="font-semibold">{overview.timeLabel ?? '–'}</span>
        </div>
        <div className={tileClass}>
          <span className="text-xs text-ink-soft">Serves</span>
          <span className="font-semibold">{overview.servings ?? '–'}</span>
        </div>
        <div className={tileClass}>
          <span className="text-xs text-ink-soft">Steps</span>
          <span className="font-semibold">{overview.stepCount > 0 ? overview.stepCount : 'No method'}</span>
        </div>
      </div>

      {overview.description && (
        <p className="text-[15px] leading-relaxed text-ink-soft">{overview.description}</p>
      )}

      {overview.chips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {overview.chips.map((chip) => (
            <li
              key={chip.label}
              className={`text-[13px] px-2.5 py-1 rounded-full capitalize ${
                chip.isHighlighted ? 'bg-accent-soft text-ink' : 'bg-primary-soft text-ink'
              }`}
            >
              {chip.label}
            </li>
          ))}
        </ul>
      )}

      {overview.notes && (
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-bold">Notes</h2>
          <p className="whitespace-pre-line text-ink-soft">{overview.notes}</p>
        </div>
      )}

      {overview.recipeUrl && (
        <p className="text-sm text-ink-soft">
          Source:{' '}
          <a
            href={overview.recipeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold underline break-all"
          >
            {overview.recipeUrl}
          </a>
        </p>
      )}
    </div>
  )
}
