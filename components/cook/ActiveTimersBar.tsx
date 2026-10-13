/**
 * ActiveTimersBar
 *
 * A strip under the header listing every timer that has been started, from
 * any step. Tapping one jumps to its step. A finished timer turns red and
 * stays until you tap it (which also dismisses the alert).
 */

import { formatClock, getRemainingMs, type CookTimerMap } from '@/lib/cook/cookTimers'
import type { CookStepData } from './cookTypes'

interface ActiveTimersBarProps {
  steps: CookStepData[]
  timers: CookTimerMap
  now: number
  finishedStepIds: string[]
  onGoToStep: (stepIndex: number) => void
  onDismissFinished: (stepId: string) => void
}

export default function ActiveTimersBar({
  steps,
  timers,
  now,
  finishedStepIds,
  onGoToStep,
  onDismissFinished,
}: ActiveTimersBarProps) {
  const entries = steps
    .map((step, index) => ({ step, index, timer: timers[step.id] }))
    .filter((entry) => entry.timer)
  if (entries.length === 0) return null

  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 py-2 bg-sunken"
      data-testid="active-timers"
      role="status"
    >
      {entries.map(({ step, index, timer }) => {
        const isFinished = timer.status === 'done'
        const isAlerting = finishedStepIds.includes(step.id)
        const label = isFinished
          ? `Step ${index + 1} done!`
          : `Step ${index + 1} · ${formatClock(getRemainingMs(timer, step.timerSeconds ?? 0, now))}${
              timer.status === 'paused' ? ' (paused)' : ''
            }`
        const colour = isFinished
          ? `bg-danger text-white ${isAlerting ? 'animate-pulse' : ''}`
          : timer.status === 'paused'
            ? 'bg-sunken '
            : 'bg-primary text-white'
        return (
          <button
            key={step.id}
            type="button"
            data-testid="active-timer"
            data-status={timer.status}
            className={`flex-none min-h-11 px-4 rounded-full font-semibold tabular-nums ${colour}`}
            onClick={() => {
              onDismissFinished(step.id)
              onGoToStep(index)
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
