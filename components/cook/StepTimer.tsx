/**
 * StepTimer
 *
 * Start / pause / reset for one step's timer, with the clock. The timer
 * state itself lives in useCookTimers, so it keeps running when you leave
 * the step.
 */

import { formatClock, getRemainingMs, type CookTimer } from '@/lib/cook/cookTimers'

interface StepTimerProps {
  stepId: string
  durationSeconds: number
  timer: CookTimer | undefined
  now: number
  onStart: (stepId: string, durationSeconds: number) => void
  onPause: (stepId: string) => void
  onReset: (stepId: string) => void
  /** Smaller layout for the one-screen quick view. */
  isCompact?: boolean
}

export default function StepTimer({
  stepId,
  durationSeconds,
  timer,
  now,
  onStart,
  onPause,
  onReset,
  isCompact = false,
}: StepTimerProps) {
  const status = timer?.status
  const remainingMs = getRemainingMs(timer, durationSeconds, now)
  const clockClass = isCompact ? 'text-2xl' : 'text-5xl sm:text-6xl'
  const buttonSize = isCompact ? 'min-h-11 px-4 text-base' : 'min-h-14 px-6 text-xl'
  const baseButton = `${buttonSize} rounded-card font-semibold`

  return (
    <div
      className="flex flex-wrap items-center gap-3"
      data-testid="step-timer"
      data-status={status ?? 'idle'}
    >
      <span
        className={`${clockClass} font-bold tabular-nums ${
          status === 'done' ? 'text-danger ' : ''
        }`}
        data-testid="timer-clock"
      >
        {status === 'done' ? 'Done!' : formatClock(remainingMs)}
      </span>
      {status === 'running' ? (
        <button
          type="button"
          className={`${baseButton} bg-accent text-ink`}
          onClick={() => onPause(stepId)}
        >
          Pause
        </button>
      ) : (
        <button
          type="button"
          className={`${baseButton} bg-primary text-white`}
          onClick={() => onStart(stepId, durationSeconds)}
        >
          {status === 'paused' ? 'Resume' : status === 'done' ? 'Restart' : 'Start timer'}
        </button>
      )}
      {status && (
        <button
          type="button"
          className={`${baseButton} bg-sunken`}
          onClick={() => onReset(stepId)}
        >
          Reset
        </button>
      )}
    </div>
  )
}
