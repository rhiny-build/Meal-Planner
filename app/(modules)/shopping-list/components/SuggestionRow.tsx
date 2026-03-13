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
  canonicalName: string
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
      ? 'text-green-600 dark:text-green-400'
      : resolution === 'rejected'
        ? 'text-red-500'
        : 'text-blue-600 dark:text-blue-400'

  return (
    <div
      className={`p-4 rounded-lg border ${
        resolved
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
          : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
          {suggestion.ingredientName}
        </span>
        <span className="text-gray-400 dark:text-gray-500 shrink-0">→</span>
        <span className="text-gray-600 dark:text-gray-300 truncate">
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
              className="px-3 py-1 text-sm font-medium rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Confirm
            </button>
            <button
              onClick={() => setShowReassign(true)}
              disabled={isPending}
              className="px-3 py-1 text-sm font-medium rounded bg-blue-600 dark:bg-fuchsia-600 text-white hover:bg-blue-700 dark:hover:bg-fuchsia-500 transition-colors disabled:opacity-50"
            >
              Reassign
            </button>
            <button
              onClick={onReject}
              disabled={isPending}
              className="px-3 py-1 text-sm font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
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
