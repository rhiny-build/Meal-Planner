/**
 * CookCaptureSlot
 *
 * "Tell me as you go" for a recipe with no method (S09). Shows one quiet, optional button;
 * nothing else nags. Notes, the Claude write-up and the review live in useMethodCapture.
 * After Save the page refreshes and cook mode shows the new steps.
 */

'use client'

import { useMethodCapture } from '@/lib/methodCapture/useMethodCapture'
import CaptureNotesPanel from './capture/CaptureNotesPanel'
import CaptureReview from './capture/CaptureReview'
import type { CookRecipeData } from './cookTypes'

export interface CookCaptureSlotProps {
  recipe: CookRecipeData
  /** Servings currently chosen on the cook screen (unused: capture works on the recipe as written). */
  servings: number
}

export default function CookCaptureSlot({ recipe }: CookCaptureSlotProps) {
  const capture = useMethodCapture(recipe.id)

  return (
    <div data-testid="cook-capture-slot" data-recipe-id={recipe.id}>
      {capture.phase === 'idle' && capture.isRestored && (
        <button
          type="button"
          className="mt-4 min-h-12 rounded-card px-5 font-semibold bg-accent-soft text-ink"
          onClick={capture.start}
        >
          Tell me as you go
        </button>
      )}
      {(capture.phase === 'capturing' || capture.phase === 'structuring') && (
        <CaptureNotesPanel
          notes={capture.notes}
          error={capture.error}
          isBusy={capture.phase === 'structuring'}
          onAddNote={capture.addNote}
          onRemoveNote={capture.removeNote}
          onFinish={capture.finish}
          onDiscard={capture.discard}
        />
      )}
      {(capture.phase === 'review' || capture.phase === 'saving') && (
        <CaptureReview
          steps={capture.steps}
          ingredients={recipe.ingredients}
          error={capture.error}
          isSaving={capture.phase === 'saving'}
          onChange={capture.setSteps}
          onSave={capture.save}
          onDiscard={capture.discard}
        />
      )}
    </div>
  )
}
