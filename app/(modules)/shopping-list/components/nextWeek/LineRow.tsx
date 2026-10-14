'use client'

import type { ListLine } from '@/lib/nextWeek/buildList'

interface LineRowProps {
  line: ListLine
  onToggle: (key: string, ticked: boolean) => void
  onEdit: (line: ListLine) => void
}

/** One tickable line: checkbox, product, one-line reason, and a small edit button for item/aisle. */
export default function LineRow({ line, onToggle, onEdit }: LineRowProps) {
  const box = line.greyed
    ? 'bg-surface border-line'
    : line.ticked
      ? 'bg-primary border-primary'
      : 'bg-surface border-ink-soft'
  return (
    <div className={`flex items-center gap-1 ${line.greyed ? 'opacity-40' : ''}`}>
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
  )
}
