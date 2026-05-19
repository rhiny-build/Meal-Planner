'use client'

import { useState, useTransition } from 'react'

interface Proposal {
  id: string
  rawName: string
  suggestedItemId: string | null
  suggestedItemName: string | null
  confidence: number
  reasoning: string
}

export default function ProposalCard({ proposal }: { proposal: Proposal }) {
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function callAction(url: string, body?: Record<string, string>) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(text || res.statusText)
    }
  }

  function handle(action: () => Promise<void>) {
    startTransition(async () => {
      try {
        await action()
        setDone(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      }
    })
  }

  if (done) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 opacity-40 text-sm text-gray-500">
        {proposal.rawName} — resolved
      </div>
    )
  }

  const pct = Math.round(proposal.confidence * 100)
  const confidenceColor =
    pct >= 80 ? 'text-green-700 bg-green-50' :
    pct >= 60 ? 'text-yellow-700 bg-yellow-50' :
    'text-red-700 bg-red-50'

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-gray-900">{proposal.rawName}</p>
          {proposal.suggestedItemName && (
            <p className="text-sm text-gray-500 mt-0.5">
              → <span className="text-gray-700">{proposal.suggestedItemName}</span>
            </p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${confidenceColor}`}>
          {pct}%
        </span>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">{proposal.reasoning}</p>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2 flex-wrap">
        {proposal.suggestedItemId && (
          <button
            disabled={isPending}
            onClick={() =>
              handle(() =>
                callAction(`/api/proposals/${proposal.id}/confirm`)
              )
            }
            className="text-xs px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
          >
            Confirm mapping
          </button>
        )}
        <button
          disabled={isPending}
          onClick={() =>
            handle(() =>
              callAction(`/api/proposals/${proposal.id}/confirm-new`)
            )
          }
          className="text-xs px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Confirm as new item
        </button>
        <button
          disabled={isPending}
          onClick={() =>
            handle(() =>
              callAction(`/api/proposals/${proposal.id}/mark-staple`)
            )
          }
          className="text-xs px-3 py-1.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
        >
          Already a staple
        </button>
        <button
          disabled={isPending}
          onClick={() =>
            handle(() =>
              callAction(`/api/proposals/${proposal.id}/reject`)
            )
          }
          className="text-xs px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  )
}
