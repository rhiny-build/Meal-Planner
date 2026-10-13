'use client'

/**
 * Suggestion Row — one pending embedding suggestion with confirm/reassign/reject actions.
 */

import { useState } from 'react'
import type { MasterListItem } from '@prisma/client'
import ScoreBadge from './ScoreBadge'
import ReassignDropdown from './ReassignDropdown'

export interface PendingSuggestion {
  shoppingListItemId: string
  ingredientName: string
  normalisedName: string
  suggestedMasterItemId: string
  suggestedMasterItemName: string
  score: number
}

type Resolution = 'confirmed' | 'rejected' | { reassignedTo: string }

interface SuggestionRowProps {
  suggestion: PendingSuggestion
  masterItems: MasterListItem[]
  resolution: Resolution | null
  onConfirm: () => void
  onReassign: (newMasterItemId: string) => void
  onReject: () => void
  isPending: boolean
}

export default function SuggestionRow({
  suggestion,
  masterItems,
  resolution,
  onConfirm,
  onReassign,
  onReject,
  isPending,
}: SuggestionRowProps) {
  const [showReassign, setShowReassign] = useState(false)
  const resolved = resolution !== null

  const label =
    resolution === 'confirmed'
      ? 'Confirmed'
      : resolution === 'rejected'
        ? 'Rejected — stays on list'
        : resolution && typeof resolution === 'object'
          ? `Reassigned → ${resolution.reassignedTo}`
          : null

  const labelColor =
    resolution === 'confirmed'
      ? 'text-primary '
      : resolution === 'rejected'
        ? 'text-danger'
        : 'text-primary '

  return (
    <div
      className={`p-4 rounded-card border ${
        resolved
          ? 'bg-ground border-line '
          : 'bg-white border-line '
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-medium text-ink truncate">
          {suggestion.ingredientName}
        </span>
        <span className="text-ink-soft shrink-0">→</span>
        <span className="text-ink-soft truncate">
          {suggestion.suggestedMasterItemName}
        </span>
        <ScoreBadge score={suggestion.score} />
      </div>

      <div className="mt-2">
        {resolved ? (
          <span className={`text-sm ${labelColor}`}>{label}</span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="px-3 py-1 text-sm font-medium rounded-card bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowReassign(true)}
              disabled={isPending}
              className="px-3 py-1 text-sm font-medium rounded-card bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              Reassign
            </button>
            <button
              onClick={onReject}
              disabled={isPending}
              className="px-3 py-1 text-sm font-medium rounded-card bg-sunken text-ink hover:bg-sunken transition-colors disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        )}
      </div>

      {showReassign && !resolved && (
        <ReassignDropdown
          masterItems={masterItems}
          onSelect={(id) => {
            onReassign(id)
            setShowReassign(false)
          }}
          onCancel={() => setShowReassign(false)}
        />
      )}
    </div>
  )
}
