/**
 * CookQuickView
 *
 * Quick recipes (e.g. Simple Fries) get one simple screen: ingredients, then
 * the method as a short list if there is one, with timers on the steps that
 * have them. No stepping.
 */

import CookIngredientList from './CookIngredientList'
import CookCaptureSlot from './CookCaptureSlot'
import StepText from './StepText'
import StepTimer from './StepTimer'
import type { CookRecipeData } from './cookTypes'
import type { CookTimerMap } from '@/lib/cook/cookTimers'

interface CookQuickViewProps {
  recipe: CookRecipeData
  servings: number
  scale: number
  timers: CookTimerMap
  now: number
  onStartTimer: (stepId: string, durationSeconds: number) => void
  onPauseTimer: (stepId: string) => void
  onResetTimer: (stepId: string) => void
}

export default function CookQuickView({
  recipe,
  servings,
  scale,
  timers,
  now,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
}: CookQuickViewProps) {
  return (
    <section className="flex-1 overflow-y-auto px-5 py-6 md:px-10" data-testid="cook-quick">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">Ingredients</h2>
        <CookIngredientList ingredients={recipe.ingredients} scale={scale} />
        {recipe.steps.length > 0 ? (
          <>
            <h2 className="text-3xl font-bold mt-8 mb-4">Method</h2>
            <ol className="space-y-6 text-2xl leading-snug">
              {recipe.steps.map((step, index) => (
                <li key={step.id} className="flex gap-3" data-testid="quick-step">
                  <span className="flex-none font-bold text-blue-700 dark:text-fuchsia-300">
                    {index + 1}.
                  </span>
                  <div className="space-y-3">
                    <p>
                      <StepText text={step.text} ingredients={recipe.ingredients} scale={scale} />
                    </p>
                    {step.timerSeconds ? (
                      <StepTimer
                        stepId={step.id}
                        durationSeconds={step.timerSeconds}
                        timer={timers[step.id]}
                        now={now}
                        onStart={onStartTimer}
                        onPause={onPauseTimer}
                        onReset={onResetTimer}
                        isCompact
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <>
            <p className="mt-8 text-gray-600 dark:text-neutral-400" data-testid="no-method-note">
              There&apos;s no method for this recipe yet.
            </p>
            <CookCaptureSlot recipe={recipe} servings={servings} />
          </>
        )}
      </div>
    </section>
  )
}
