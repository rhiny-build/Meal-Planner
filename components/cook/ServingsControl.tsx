/**
 * ServingsControl
 *
 * Minus / plus around the number of servings. Big enough for a thumb.
 */

import { changeServings, MAX_SERVINGS, MIN_SERVINGS } from '@/lib/cook/scaleServings'

interface ServingsControlProps {
  servings: number
  onChange: (servings: number) => void
}

const buttonClass =
  'w-11 h-11 rounded-card bg-surface text-2xl leading-none font-semibold disabled:opacity-40'

export default function ServingsControl({ servings, onChange }: ServingsControlProps) {
  return (
    <div className="flex items-center gap-1.5 bg-ground rounded-card p-1" data-testid="servings-control">
      <button
        type="button"
        className={buttonClass}
        aria-label="Fewer servings"
        disabled={servings <= MIN_SERVINGS}
        onClick={() => onChange(changeServings(servings, -1))}
      >
        &minus;
      </button>
      <span className="min-w-[4.5rem] text-center leading-tight">
        <span className="block text-xl font-bold" data-testid="servings-value">
          {servings}
        </span>
        <span className="block text-xs text-ink-soft">servings</span>
      </span>
      <button
        type="button"
        className={buttonClass}
        aria-label="More servings"
        disabled={servings >= MAX_SERVINGS}
        onClick={() => onChange(changeServings(servings, 1))}
      >
        +
      </button>
    </div>
  )
}
