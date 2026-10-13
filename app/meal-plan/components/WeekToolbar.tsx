/**
 * WeekToolbar
 *
 * Week navigation (previous / next) and the plan actions: fill empty days
 * with AI, save and clear.
 */

import Button from '@/components/Button'

interface WeekToolbarProps {
  isGenerating: boolean
  isSaving: boolean
  onPreviousWeek: () => void
  onNextWeek: () => void
  onGenerate: () => void
  onSave: () => void
  onClear: () => void
}

const navButton =
  'w-11 h-11 rounded-card bg-surface text-ink text-xl font-semibold flex items-center justify-center'

export default function WeekToolbar({
  isGenerating,
  isSaving,
  onPreviousWeek,
  onNextWeek,
  onGenerate,
  onSave,
  onClear,
}: WeekToolbarProps) {
  return (
    <div className="flex flex-col gap-2 pb-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPreviousWeek}
          className={navButton}
          aria-label="Previous week"
        >
          &larr;
        </button>
        <button
          type="button"
          onClick={onNextWeek}
          className={navButton}
          aria-label="Next week"
        >
          &rarr;
        </button>
        <div className="flex-1" />
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save plan'}
        </Button>
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate with AI'}
        </Button>
        <Button variant="secondary" size="sm" onClick={onClear}>
          Clear all
        </Button>
      </div>
    </div>
  )
}
