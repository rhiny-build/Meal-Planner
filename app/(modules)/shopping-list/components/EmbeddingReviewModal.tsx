'use client'

/**
 * Embedding Review Modal — full-screen overlay for reviewing pending suggestions.
 *
 * Shown after pipeline generates suggestions (score 0.50–0.90).
 * User confirms, reassigns, or rejects each before seeing the final list.
 */

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import type { MasterListItem } from '@prisma/client'
import { confirmSuggestion, reassignSuggestion, rejectSuggestion } from '../suggestionActions'
import SuggestionRow from './SuggestionRow'
import type { PendingSuggestion } from './SuggestionRow'
import Button from '@/components/Button'

type Resolution = 'confirmed' | 'rejected' | { reassignedTo: string }

interface EmbeddingReviewModalProps {
  suggestions: PendingSuggestion[]
  masterItems: MasterListItem[]
  onComplete: () => void
}

export default function EmbeddingReviewModal({
  suggestions,
  masterItems,
  onComplete,
}: EmbeddingReviewModalProps) {
  const [isPending, startTransition] = useTransition()
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>({})

  const resolvedCount = Object.keys(resolutions).length

  // Mark all suggestions sharing the same normalisedName as resolved
  const resolveByNormalisedName = (normalisedName: string, resolution: Resolution) => {
    setResolutions((prev) => {
      const updated = { ...prev }
      for (const sug of suggestions) {
        if (sug.normalisedName === normalisedName) {
          updated[sug.shoppingListItemId] = resolution
        }
      }
      return updated
    })
  }

  const handleConfirm = (s: PendingSuggestion) => {
    startTransition(async () => {
      try {
        await confirmSuggestion(s.shoppingListItemId, s.suggestedMasterItemId)
        resolveByNormalisedName(s.normalisedName, 'confirmed')
      } catch {
        toast.error('Failed to confirm suggestion')
      }
    })
  }

  const handleReassign = (s: PendingSuggestion, newMasterItemId: string) => {
    const masterItem = masterItems.find((m) => m.id === newMasterItemId)
    startTransition(async () => {
      try {
        await reassignSuggestion(s.shoppingListItemId, newMasterItemId)
        resolveByNormalisedName(s.normalisedName, { reassignedTo: masterItem?.name ?? 'selected item' })
      } catch {
        toast.error('Failed to reassign suggestion')
      }
    })
  }

  const handleReject = (s: PendingSuggestion) => {
    startTransition(async () => {
      try {
        await rejectSuggestion(s.shoppingListItemId, s.suggestedMasterItemId, s.normalisedName)
        resolveByNormalisedName(s.normalisedName, 'rejected')
      } catch {
        toast.error('Failed to reject suggestion')
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="w-full max-w-2xl my-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
            Before we generate your list...
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            We found {suggestions.length} possible match{suggestions.length !== 1 ? 'es' : ''} to
            items already in your pantry. Review each one so we can keep your shopping list accurate.
          </p>

          <div className="space-y-3">
            {[...suggestions].sort((a, b) => b.score - a.score).map((s) => (
              <SuggestionRow
                key={s.shoppingListItemId}
                suggestion={s}
                masterItems={masterItems}
                resolution={resolutions[s.shoppingListItemId] ?? null}
                onConfirm={() => handleConfirm(s)}
                onReassign={(id) => handleReassign(s, id)}
                onReject={() => handleReject(s)}
                isPending={isPending}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {resolvedCount} of {suggestions.length} reviewed
            </span>
            <Button disabled={isPending} onClick={onComplete}>
              Continue to shopping list
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
