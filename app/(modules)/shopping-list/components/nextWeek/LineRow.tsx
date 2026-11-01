'use client'

import type { ListLine } from '@/lib/nextWeek/buildList'

interface LineRowProps {
  line: ListLine
  onToggle: (key: string, ticked: boolean) => void
  onEdit: (line: ListLine) => void
  onFix: (line: ListLine) => void
}

/**
 * One tickable line: checkbox, product, one-line reason, a small edit button for item/aisle, and for meal
 * ingredients a link to fix which product the ingredient means.
 */
export default function LineRow({ line, onToggle, onEdit, onFix }: LineRowProps) {
  const box = line.greyed
    ? 'bg-surface border-line'
    : line.ticked
      ? 'bg-primary border-primary'
      : 'bg-surface border-ink-soft'
  const fixLabel = line.match === 'matched' ? 'Wrong product?' : 'Which product is it?'
  return (
    <div className={line.greyed ? 'opacity-40' : ''}>
    <div className="flex items-center gap-1">
      <button
        type="button"
        role="checkbox"
        aria-checked={line.ticked}
        aria-disabled={line.greyed || undefined}
        disabled={line.greyed}
        onClick={() => onToggle(line.key, !line.ticked)}
        className="flex-1 min-w-0 flex items-center gap-3 min-h-11 py-1.5 text-left"
      >
        <span className={`w-[22px] h-[22px] rounded-[7px] border-2 flex-none ${box}`} aria-hidden />
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-medium text-ink">{line.label}</span>
          {line.why && <span className="block text-xs text-ink-soft">{line.why}</span>}
        </span>
      </button>
      {line.item && !line.greyed && (
        <button
          type="button"
          onClick={() => onEdit(line)}
          aria-label={`Edit ${line.label}`}
          className="min-w-11 min-h-11 text-ink-soft text-sm"
        >
          Edit
        </button>
      )}
    </div>
    {line.match && !line.greyed && (
      <button
        type="button"
        onClick={() => onFix(line)}
        aria-label={`${fixLabel} ${line.ingredients?.[0] ?? line.label}`}
        className="ml-[34px] min-h-11 text-xs font-semibold text-primary -mt-1.5"
      >
        {fixLabel}
      </button>
    )}
    </div>
  )
}
