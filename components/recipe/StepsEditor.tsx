/**
 * StepsEditor
 *
 * Editable method: add, remove, reorder steps, optional timer per step.
 * Presentational: the parent owns the steps. Step text is held in stored form
 * ("{ing:<id>}" tokens); the textarea shows ingredient names in braces
 * ("{flour}") and converts back as you type. A method is always optional, so
 * zero steps is a perfectly good state.
 */

'use client'

import { useRef } from 'react'
import Button from '@/components/Button'
import { renderStepText } from '@/lib/recipeStepTokens'
import { stepToEditorText, editorTextToStep } from '@/lib/stepEditorText'
import type { IngredientRow } from './IngredientsEditor'

export interface StepRow {
  key: string
  text: string // stored form
  timerMinutes: string // '' = no timer
}

interface StepsEditorProps {
  steps: StepRow[]
  onChange: (steps: StepRow[]) => void
  ingredients: IngredientRow[]
}

const inputClass = 'w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-700'

export default function StepsEditor({ steps, onChange, ingredients }: StepsEditorProps) {
  const areas = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const named = ingredients.filter((i) => i.name.trim())

  const update = (key: string, patch: Partial<StepRow>) =>
    onChange(steps.map((s) => (s.key === key ? { ...s, ...patch } : s)))

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const insertIngredient = (step: StepRow, name: string) => {
    const el = areas.current[step.key]
    const shown = stepToEditorText(step.text, named)
    const at = el ? el.selectionStart : shown.length
    const next = `${shown.slice(0, at)}{${name}}${shown.slice(at)}`
    update(step.key, { text: editorTextToStep(next, named) })
  }

  return (
    <section aria-labelledby="method-heading" data-testid="steps-editor">
      <h3 id="method-heading" className="text-lg font-semibold mb-1">
        Method <span className="text-sm font-normal text-gray-500">(optional)</span>
      </h3>
      {steps.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No steps. That is fine.</p>
      )}

      <ol className="space-y-3">
        {steps.map((step, i) => {
          const preview = renderStepText(step.text, named.map((n) => ({ ...n })))
          return (
            <li
              key={step.key}
              className="border rounded p-3 dark:border-gray-700 space-y-2"
              data-testid="step-row"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Step {i + 1}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move step ${i + 1} up`}
                    className="px-3 py-1.5 rounded border dark:border-gray-700 disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === steps.length - 1}
                    aria-label={`Move step ${i + 1} down`}
                    className="px-3 py-1.5 rounded border dark:border-gray-700 disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(steps.filter((s) => s.key !== step.key))}
                    aria-label={`Remove step ${i + 1}`}
                    className="px-3 py-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <textarea
                ref={(el) => {
                  areas.current[step.key] = el
                }}
                aria-label={`Text of step ${i + 1}`}
                value={stepToEditorText(step.text, named)}
                onChange={(e) => update(step.key, { text: editorTextToStep(e.target.value, named) })}
                rows={3}
                placeholder="What to do. Use {ingredient name} to mention an ingredient."
                className={inputClass}
              />

              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  Timer (min)
                  <input
                    type="number"
                    min="0"
                    step="any"
                    inputMode="decimal"
                    aria-label={`Timer minutes for step ${i + 1}`}
                    value={step.timerMinutes}
                    onChange={(e) => update(step.key, { timerMinutes: e.target.value })}
                    className="w-20 p-2 border rounded dark:bg-gray-800 dark:border-gray-700"
                  />
                </label>
                {named.length > 0 && (
                  <select
                    aria-label={`Insert an ingredient into step ${i + 1}`}
                    value=""
                    onChange={(e) => e.target.value && insertIngredient(step, e.target.value)}
                    className="p-2 border rounded dark:bg-gray-800 dark:border-gray-700 max-w-full"
                  >
                    <option value="">Insert ingredient...</option>
                    {named.map((n) => (
                      <option key={n.id} value={n.name.trim()}>
                        {n.name.trim()}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {preview !== step.text && (
                <p className="text-sm text-gray-600 dark:text-gray-400" data-testid="step-preview">
                  Reads as: {preview}
                </p>
              )}
            </li>
          )
        })}
      </ol>

      <div className="mt-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() =>
            onChange([...steps, { key: `s${Date.now()}${steps.length}`, text: '', timerMinutes: '' }])
          }
        >
          Add step
        </Button>
      </div>
    </section>
  )
}
