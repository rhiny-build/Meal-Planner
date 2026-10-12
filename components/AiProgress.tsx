/**
 * AiProgress
 *
 * One small progress indicator for any AI action that takes more than a couple of seconds
 * (Inspire Me, Import, meal plan fill, shopping list). It shows what is happening, how long it
 * has been running, a bar, and a rough "usually takes" estimate.
 *
 * The bar is an honest guess, not a real percentage: the server cannot report progress, so the
 * bar eases towards 90% over the expected time and then waits. If the action runs past the
 * upper estimate the text says so instead of pretending. It disappears when `active` is false.
 *
 * Usage:
 *   <AiProgress active={isSearching} label="Searching the web for recipes" estimate={[15, 45]} />
 */

'use client'

import { useEffect, useState } from 'react'

interface AiProgressProps {
  active: boolean
  /** What is happening, e.g. "Reading the recipe". */
  label: string
  /** Rough [low, high] duration in seconds, shown as "Usually takes 10-20 seconds". */
  estimate: [number, number]
  className?: string
}

/** Whole seconds since `active` became true; 0 while inactive. */
export function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!active) {
      setSeconds(0)
      return
    }
    const started = Date.now()
    setSeconds(0)
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 500)
    return () => clearInterval(timer)
  }, [active])
  return seconds
}

/**
 * Bar position (0-90) after `elapsed` seconds: eases out so it never looks finished early.
 * Reaches about 57% at half the high estimate and about 78% at the high estimate.
 */
export function progressPercent(elapsed: number, highEstimate: number): number {
  const tau = Math.max(highEstimate, 1) / 2
  return Math.round(90 * (1 - Math.exp(-elapsed / tau)))
}

export default function AiProgress({ active, label, estimate, className = '' }: AiProgressProps) {
  const elapsed = useElapsedSeconds(active)
  if (!active) return null

  const [low, high] = estimate
  const overdue = elapsed > high
  const percent = progressPercent(elapsed, high)

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="ai-progress"
      className={`rounded border border-blue-200 bg-blue-50 p-3 text-sm dark:border-fuchsia-900 dark:bg-fuchsia-950/30 ${className}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium">{label}...</span>
        <span className="tabular-nums text-gray-600 dark:text-gray-400" data-testid="ai-progress-elapsed">
          {elapsed}s
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-2 h-2 w-full overflow-hidden rounded bg-blue-100 dark:bg-fuchsia-900/40"
      >
        <div
          className="h-full rounded bg-blue-600 transition-[width] duration-500 ease-out dark:bg-fuchsia-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-gray-600 dark:text-gray-400" data-testid="ai-progress-note">
        {overdue
          ? 'Taking longer than usual. Still working, please keep this open.'
          : `Usually takes ${low}-${high} seconds.`}
      </p>
    </div>
  )
}
