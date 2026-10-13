/**
 * CaptureReview: edit, reorder or delete the steps Claude wrote, then Save or Discard.
 * Step text is edited with ingredient names in {braces}; tokens are restored on change.
 */

'use client'

import { editorTextToStep, stepToEditorText } from '@/lib/stepEditorText'
import type { CaptureStep } from '@/lib/methodCapture/captureNotes'
import type { CookIngredientData } from '../cookTypes'

interface CaptureReviewProps {
  steps: CaptureStep[]
  ingredients: CookIngredientData[]
  error: string | null
  isSaving: boolean
  onChange: (steps: CaptureStep[]) => void
  onSave: () => void
  onDiscard: () => void
}

const smallButton = 'min-h-11 min-w-11 rounded-card bg-sunken font-semibold disabled:opacity-30'

export default function CaptureReview({ steps, ingredients, error, isSaving, onChange, onSave, onDiscard }: CaptureReviewProps) {
  const editable = ingredients.filter((ingredient) => !ingredient.id.startsWith('legacy-'))
  const update = (index: number, patch: Partial<CaptureStep>) =>
    onChange(steps.map((step, position) => (position === index ? { ...step, ...patch } : step)))
  const move = (index: number, offset: number) => {
    const target = index + offset
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="mt-8 border-t border-line pt-6" data-testid="capture-review">
      <h2 className="text-2xl font-bold mb-1">Check the method</h2>
      <p className="text-ink-soft mb-4">
        Written from your notes only. Fix anything, reorder or delete, then save. A name in {'{braces}'} is an ingredient of this recipe. Nothing is saved until you do.
      </p>
      <ol className="space-y-4">
        {steps.map((step, index) => (
          <li key={index} className="rounded-card bg-sunken p-3" data-testid="review-step">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-bold text-primary">Step {index + 1}</span>
              {step.timerSeconds ? (
                <button
                  type="button"
                  className="text-sm rounded-full bg-accent-soft text-ink px-3 py-1"
                  onClick={() => update(index, { timerSeconds: null })}
                  aria-label="Remove timer"
                >
                  Timer {Math.round(step.timerSeconds / 60) || '<1'} min &times;
                </button>
              ) : null}
            </div>
            <textarea
              value={stepToEditorText(step.text, editable)}
              onChange={(event) => update(index, { text: editorTextToStep(event.target.value, editable) })}
              rows={2}
              aria-label={`Step ${index + 1} text`}
              className="w-full rounded-card border border-line bg-white p-2 text-lg"
            />
            <div className="mt-2 flex gap-2">
              <button type="button" className={smallButton} disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move step ${index + 1} up`}>
                &uarr;
              </button>
              <button type="button" className={smallButton} disabled={index === steps.length - 1} onClick={() => move(index, 1)} aria-label={`Move step ${index + 1} down`}>
                &darr;
              </button>
              <button type="button" className={`${smallButton} px-3`} onClick={() => onChange(steps.filter((_, position) => position !== index))}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="min-h-12 rounded-card px-5 font-semibold bg-primary text-white disabled:opacity-40"
          disabled={isSaving || steps.every((step) => !step.text.trim())}
          onClick={onSave}
        >
          {isSaving ? 'Saving...' : 'Save method'}
        </button>
        <button type="button" className="min-h-12 rounded-card px-5 font-semibold bg-sunken " disabled={isSaving} onClick={onDiscard}>
          Discard
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-danger " data-testid="capture-error">
          {error}
        </p>
      )}
    </div>
  )
}
