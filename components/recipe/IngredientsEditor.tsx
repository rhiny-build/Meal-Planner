/**
 * IngredientsEditor
 *
 * Editable list of ingredient rows (amount, unit, name, note). Presentational:
 * the parent owns the rows. Rows carry stable ids so method steps can refer to
 * them with {ing:<id>} tokens.
 */

'use client'

import { useState } from 'react'
import Button from '@/components/Button'

export interface IngredientRow {
  id: string
  name: string
  quantity: string
  unit: string
  notes: string
}

interface IngredientsEditorProps {
  rows: IngredientRow[]
  onChange: (rows: IngredientRow[]) => void
  /** Called with the removed row before it disappears (so steps can be tidied) */
  onRemove: (row: IngredientRow) => void
  /** Parses pasted lines ("2 cups rice") into rows */
  onPasteLines: (text: string) => void
}

const inputClass = 'w-full p-2 border rounded-card  '

export default function IngredientsEditor({
  rows,
  onChange,
  onRemove,
  onPasteLines,
}: IngredientsEditorProps) {
  const [pasting, setPasting] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const update = (id: string, patch: Partial<IngredientRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  return (
    <section aria-labelledby="ingredients-heading" data-testid="ingredients-editor">
      <h3 id="ingredients-heading" className="text-lg font-semibold mb-2">
        Ingredients <span className="text-danger">*</span>
      </h3>

      <ul className="space-y-3">
        {rows.map((row, i) => (
          <li
            key={row.id}
            className="grid grid-cols-[4.5rem_1fr_auto] sm:grid-cols-[5rem_6rem_1fr_1fr_auto] gap-2 items-start"
            data-testid="ingredient-row"
          >
            <input
              aria-label={`Amount for ingredient ${i + 1}`}
              placeholder="Amt"
              value={row.quantity}
              onChange={(e) => update(row.id, { quantity: e.target.value })}
              className={inputClass}
            />
            <input
              aria-label={`Unit for ingredient ${i + 1}`}
              placeholder="Unit"
              value={row.unit}
              onChange={(e) => update(row.id, { unit: e.target.value })}
              className={inputClass}
            />
            <input
              aria-label={`Name of ingredient ${i + 1}`}
              placeholder="Ingredient"
              value={row.name}
              onChange={(e) => update(row.id, { name: e.target.value })}
              className={`${inputClass} col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto`}
            />
            <input
              aria-label={`Note for ingredient ${i + 1}`}
              placeholder="Note (diced...)"
              value={row.notes}
              onChange={(e) => update(row.id, { notes: e.target.value })}
              className={`${inputClass} col-span-2 sm:col-span-1`}
            />
            <button
              type="button"
              onClick={() => {
                onRemove(row)
                onChange(rows.filter((r) => r.id !== row.id))
              }}
              aria-label={`Remove ingredient ${i + 1}`}
              className="px-3 py-2 min-h-[2.5rem] rounded-card text-danger hover:bg-danger-soft col-start-3 row-start-1 sm:col-start-auto sm:row-start-auto"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2 mt-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() =>
            onChange([
              ...rows,
              { id: newId(), name: '', quantity: '', unit: '', notes: '' },
            ])
          }
        >
          Add ingredient
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => setPasting(!pasting)}>
          {pasting ? 'Close paste' : 'Paste a list'}
        </Button>
      </div>

      {pasting && (
        <div className="mt-3 space-y-2">
          <textarea
            aria-label="Paste ingredient lines"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={5}
            placeholder={'4 chicken breasts\n2 cups rice\nSalt and pepper'}
            className={inputClass}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onPasteLines(pasteText)
              setPasteText('')
              setPasting(false)
            }}
          >
            Add these lines
          </Button>
        </div>
      )}
    </section>
  )
}

/** Short id that satisfies the {ing:<id>} token alphabet. */
export function newId(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '')
      : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
  return `n${random.slice(0, 20)}`
}
