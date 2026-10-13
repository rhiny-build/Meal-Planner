/**
 * CookStepView
 *
 * One step, big: the step number, the text with scaled amounts, and the
 * step's timer when it has one.
 */

import StepText from './StepText'
import StepTimer from './StepTimer'
import type { CookIngredientData, CookStepData } from './cookTypes'
import type { CookTimer } from '@/lib/cook/cookTimers'

interface CookStepViewProps {
  step: CookStepData
  /** Smaller type when shown inside the recipe page's Method tab. */
  isEmbedded?: boolean
  stepNumber: number
  stepCount: number
  ingredients: CookIngredientData[]
  scale: number
  timer: CookTimer | undefined
  now: number
  onStartTimer: (stepId: string, durationSeconds: number) => void
  onPauseTimer: (stepId: string) => void
  onResetTimer: (stepId: string) => void
}

export default function CookStepView({
  step,
  isEmbedded = false,
  stepNumber,
  stepCount,
  ingredients,
  scale,
  timer,
  now,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
}: CookStepViewProps) {
  return (
    <section
      className={`flex-1 overflow-y-auto ${isEmbedded ? 'px-1 py-3' : 'px-5 py-6 md:px-10'}`}
      data-testid="cook-step"
    >
      <div className="max-w-4xl mx-auto">
        <p
          className="mb-4 text-lg font-bold uppercase tracking-wide text-primary"
          data-testid="step-counter"
        >
          Step {stepNumber} of {stepCount}
        </p>
        <p
          className={`leading-snug font-medium ${
            isEmbedded ? 'text-2xl' : 'text-3xl sm:text-4xl md:text-5xl'
          }`}
          data-testid="step-text"
        >
          <StepText text={step.text} ingredients={ingredients} scale={scale} />
        </p>
        {step.timerSeconds ? (
          <div className="mt-8">
            <StepTimer
              stepId={step.id}
              durationSeconds={step.timerSeconds}
              timer={timer}
              now={now}
              onStart={onStartTimer}
              onPause={onPauseTimer}
              onReset={onResetTimer}
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
