'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import Button from '@/components/Button'
import type { ListLine } from '@/lib/nextWeek/buildList'
import type { MatchItem } from '@/lib/nextWeek/matchPrompt'
import { setIngredientMatch } from '../../nextWeekActions'

interface FixMatchSheetProps {
  line: ListLine
  items: MatchItem[]
  onClose: () => void
  onSaved: () => void
}

/**
 * Pick which of Ronen's items a recipe ingredient is, or "I don't buy this". The pick is saved against the
 * ingredient name, so it applies to every recipe that uses it.
 */
export default function FixMatchSheet({ line, items, onClose, onSaved }: FixMatchSheetProps) {
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const ingredient = line.ingredients?.[0] ?? line.label

  const shown = useMemo(() => {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    return items.filter(i => words.every(w => i.item.toLowerCase().includes(w))).slice(0, 60)
  }, [items, query])

  const choose = async (item: string | null) => {
    setSaving(true)
    try {
      await setIngredientMatch(line.ingredients ?? [line.label], item)
      toast.success('Saved')
      onSaved()
    } catch {
      toast.error('Could not save')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" role="dialog" aria-label="Which product is it?">
      <div className="w-full max-w-sm max-h-[85vh] bg-surface rounded-card p-4 flex flex-col gap-3">
        <div>
          <p className="text-xs text-ink-soft">Which of your products is</p>
          <p className="font-display text-lg font-bold">{ingredient}?</p>
        </div>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search your items"
          aria-label="Search your items"
          className="min-h-11 px-3 rounded-card border border-line text-base"
        />
        <ul className="flex-1 overflow-y-auto -mx-1" aria-label="Your items">
          {shown.map(i => (
            <li key={i.item}>
              <button
                type="button"
                disabled={saving}
                onClick={() => choose(i.item)}
                className="w-full min-h-11 px-1 py-1.5 text-left flex items-baseline justify-between gap-2"
              >
                <span className="text-[15px] font-medium text-ink">{i.item}</span>
                <span className="text-xs text-ink-soft">{i.aisle}</span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="py-3 text-ink-soft text-sm">No item matches that.</li>}
        </ul>
        <div className="flex gap-2 justify-between">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" onClick={() => choose(null)} disabled={saving}>I don&apos;t buy this</Button>
        </div>
      </div>
    </div>
  )
}
