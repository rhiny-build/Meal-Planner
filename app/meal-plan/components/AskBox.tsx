'use client'

/**
 * AskBox: "swap Wednesday for fish". Sends the request to the meal-plan agent, which changes the plan (or the pending
 * draft) with small tools, and shows what it changed with its own one line. Design: docs/rehaul/mockups/Week.dc.html.
 */

import { useState } from 'react'
import AiProgress from '@/components/AiProgress'
import type { SlotChange } from '@/lib/mealPlanAgent/agentTools'

interface AskResult {
  message: string
  changes: SlotChange[]
}

interface AskBoxProps {
  weekStart: string
  /** Make sure unsaved edits on screen are kept before the agent changes things on the server */
  beforeAsk: () => Promise<void>
  /** Reload the week after the agent changed it */
  onChanged: () => Promise<void>
  recipeNames: Record<string, string>
}

const SLOT_LABEL: Record<string, string> = { lunch: 'lunch', protein: 'main', carb: 'carb', vegetable: 'vegetable' }

export default function AskBox({ weekStart, beforeAsk, onChanged, recipeNames }: AskBoxProps) {
  const [text, setText] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [result, setResult] = useState<AskResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ask = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!text.trim() || isAsking) return
    setIsAsking(true)
    setError(null)
    setResult(null)
    try {
      await beforeAsk()
      const res = await fetch('/api/meal-plan/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: text, weekStart }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'That did not work, please try again.')
      setResult(json)
      setText('')
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work, please try again.')
    } finally {
      setIsAsking(false)
    }
  }

  const name = (id: string | null) => (id ? recipeNames[id] ?? 'a recipe' : 'nothing')

  return (
    <div className="mt-4 mb-2 flex flex-col gap-2">
      <AiProgress active={isAsking} label="Working on your change" estimate={[5, 20]} />
      {error && <p role="alert" className="bg-danger-soft text-danger rounded-card px-4 py-3 text-sm">{error}</p>}
      {result && (
        <div className="bg-surface rounded-card px-4 py-3 text-sm" data-testid="ask-result">
          <p className="font-semibold text-ink">{result.message}</p>
          {result.changes.length > 0 && (
            <ul className="mt-1 text-ink-soft">
              {result.changes.map(c => (
                <li key={`${c.date}-${c.slot}`}>
                  {c.day} {SLOT_LABEL[c.slot]}: {name(c.was)} → {name(c.now)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <form onSubmit={ask} className="flex gap-2.5 items-center bg-surface rounded-2xl py-2 pl-4 pr-2">
        <label htmlFor="ask-plan" className="sr-only">Ask for a change</label>
        <input
          id="ask-plan"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="e.g. swap Wednesday for fish"
          maxLength={500}
          className="flex-1 min-w-0 min-h-11 bg-transparent outline-none text-[15px]"
        />
        <button
          type="submit"
          disabled={isAsking || !text.trim()}
          className="min-h-11 px-4 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
        >
          {isAsking ? 'Asking…' : 'Ask'}
        </button>
      </form>
    </div>
  )
}
