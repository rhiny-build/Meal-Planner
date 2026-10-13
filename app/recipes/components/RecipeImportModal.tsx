/**
 * Recipe Import Modal
 *
 * "Import from URL or description": one box, runs the recipe importer agent, shows the
 * draft for review, and saves it to the recipe book only when asked.
 *
 * This review view is deliberately minimal (read-only). It is to be replaced by the
 * recipe editor from S04 once that is merged: draft in, edited draft out.
 */

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/Button'
import AiProgress from '@/components/AiProgress'
import { renderStepText } from '@/lib/recipeStepTokens'
import type { ImportResult } from '@/lib/agents/recipeImporter/types'

type ImportResponse = ImportResult & { runId: string }

interface RecipeImportModalProps {
  onSaved: () => void | Promise<void>
  onClose: () => void
  /** Pre-fill the box (e.g. the URL of an accepted Inspire Me suggestion). */
  initialInput?: string
  /** Start importing `initialInput` as soon as the modal opens. */
  autoStart?: boolean
}

export default function RecipeImportModal({
  onSaved,
  onClose,
  initialInput = '',
  autoStart = false,
}: RecipeImportModalProps) {
  const [input, setInput] = useState(initialInput)
  const [isImporting, setIsImporting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResponse | null>(null)
  const [failedRunId, setFailedRunId] = useState<string | null>(null)

  const handleImport = async (text: string = input) => {
    if (!text.trim()) {
      setError('Paste a recipe URL, or describe the recipe')
      return
    }
    setIsImporting(true)
    setError('')
    setFailedRunId(null)
    try {
      const response = await fetch('/api/recipes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text }),
      })
      const data = await response.json()
      if (!response.ok) {
        setFailedRunId(data.runId ?? null)
        throw new Error(data.error || 'Import failed')
      }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  // Run once on open; the ref stops React strict mode (dev) from starting a second paid run.
  const autoStarted = useRef(false)
  useEffect(() => {
    if (autoStart && initialInput.trim() && !autoStarted.current) {
      autoStarted.current = true
      void handleImport(initialInput)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    if (!result) return
    setIsSaving(true)
    setError('')
    try {
      const response = await fetch('/api/recipes/import/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft: result.draft }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Could not save the recipe')
      }
      await onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the recipe')
    } finally {
      setIsSaving(false)
    }
  }

  const draft = result?.draft
  // Draft steps refer to ingredients by draft key; render them as readable text for review.
  const stepIngredients = draft?.ingredients.map((ing) => ({ ...ing, id: ing.key })) ?? []

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-card shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              {draft ? 'Review imported recipe' : 'Import from URL or description'}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-ink-soft hover:text-ink p-2"
            >
              ✕
            </button>
          </div>

          {!draft && (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">
                Paste a recipe link, or describe a recipe in your own words. You can review it before
                anything is saved.
              </p>
              <textarea
                aria-label="Recipe URL or description"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={5}
                disabled={isImporting}
                placeholder="https://... or: my schnitzel: chicken breast, flatten, egg, breadcrumbs, fry 4 min a side"
                className="w-full p-2 border rounded-card"
              />
              {error && (
                <p className="text-danger text-sm" role="alert">
                  {error}{' '}
                  {failedRunId && (
                    <Link href={`/agent-runs/${failedRunId}`} className="underline">
                      See what happened
                    </Link>
                  )}
                </p>
              )}
              <div className="flex items-center gap-3">
                <Button onClick={() => handleImport()} disabled={isImporting}>
                  {isImporting ? 'Reading the recipe...' : 'Import'}
                </Button>
              </div>
              {/* The importer reads the page and writes the recipe: measured 4-16 s */}
              <AiProgress active={isImporting} label="Reading the recipe" estimate={[5, 20]} />
            </div>
          )}

          {draft && result && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold">{draft.name}</h3>
                <p className="text-sm text-ink-soft">
                  {[
                    draft.kind === 'quick' ? 'Quick item' : 'Full recipe',
                    draft.servings ? `Serves ${draft.servings}` : null,
                    draft.totalTimeMinutes ? `${draft.totalTimeMinutes} min` : null,
                    draft.proteinType ? `Protein: ${draft.proteinType}` : null,
                    draft.carbType ? `Carb: ${draft.carbType}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {draft.description && <p className="text-sm mt-1">{draft.description}</p>}
                {draft.sourceUrl && (
                  <a
                    href={draft.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline break-all"
                  >
                    {draft.sourceUrl}
                  </a>
                )}
              </div>

              {result.similarRecipes.length > 0 && (
                <div className="bg-accent-soft p-3 rounded-card text-sm" role="status">
                  Already in your book, maybe the same recipe:{' '}
                  {result.similarRecipes.map((r) => r.name).join(', ')}
                </div>
              )}

              <div>
                <h4 className="font-medium mb-1">Ingredients</h4>
                <ul className="list-disc pl-5 text-sm space-y-0.5">
                  {draft.ingredients.map((ing) => (
                    <li key={ing.key}>
                      {[ing.quantity, ing.unit, ing.name].filter(Boolean).join(' ')}
                      {ing.notes ? ` (${ing.notes})` : ''}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-1">Method</h4>
                {draft.steps.length === 0 ? (
                  <p className="text-sm text-ink-soft">
                    No method found. It will be saved without steps; you can add one later.
                  </p>
                ) : (
                  <ol className="list-decimal pl-5 text-sm space-y-1">
                    {draft.steps.map((step, i) => (
                      <li key={i}>
                        {renderStepText(step.text, stepIngredients)}
                        {step.timerSeconds ? (
                          <span className="text-ink-soft"> (timer {Math.round(step.timerSeconds / 60)} min)</span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {error && (
                <p className="text-danger text-sm" role="alert">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save to recipe book'}
                </Button>
                <Button variant="secondary" onClick={onClose}>
                  Discard
                </Button>
                <Link href={`/agent-runs/${result.runId}`} className="text-sm underline text-ink-soft">
                  How it was imported
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
