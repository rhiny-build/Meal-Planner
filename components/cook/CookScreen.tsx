/**
 * CookScreen
 *
 * The full-screen cook mode for one recipe. Owns the state that must survive
 * changing step: current step, chosen servings and (via useCookTimers) every
 * timer. Picks the view: one step per screen for a recipe with a method, a
 * one-screen view for quick recipes, ingredients plus a note when there is
 * no method.
 *
 * Full screen by default. With `isEmbedded` it sits inside the recipe page's
 * Method tab instead: no header, and the servings are owned by the page so
 * the Ingredients tab and the steps always agree.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCookTimers } from '@/lib/cook/useCookTimers'
import { useScreenWakeLock } from '@/lib/cook/useScreenWakeLock'
import { useSwipe } from '@/lib/cook/useSwipe'
import { getServingsScale } from '@/lib/cook/scaleServings'
import {
  clampStepIndex,
  getNextStepIndex,
  getPreviousStepIndex,
  isFirstStep,
  isLastStep,
} from '@/lib/cook/stepNavigation'
import ServingsControl from './ServingsControl'
import ActiveTimersBar from './ActiveTimersBar'
import IngredientsSheet from './IngredientsSheet'
import CookStepView from './CookStepView'
import CookNoMethod from './CookNoMethod'
import CookQuickView from './CookQuickView'
import type { CookRecipeData } from './cookTypes'

interface CookScreenProps {
  recipe: CookRecipeData
  /** Render inside a page instead of as a full-screen overlay. */
  isEmbedded?: boolean
  /** Servings chosen by the page (embedded only); omit to let cook mode own them. */
  servings?: number
  onServingsChange?: (servings: number) => void
  /** Embedded only: false while the Method tab is hidden, so the screen can sleep. */
  isActive?: boolean
}

const bottomButton = 'min-h-16 rounded-panel text-xl font-bold'

export default function CookScreen({
  recipe,
  isEmbedded = false,
  servings: controlledServings,
  onServingsChange,
  isActive = true,
}: CookScreenProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [ownServings, setOwnServings] = useState(recipe.servings ?? 1)
  const servings = controlledServings ?? ownServings
  const setServings = onServingsChange ?? setOwnServings
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false)
  const timers = useCookTimers()
  const isAwake = useScreenWakeLock(isActive)

  const stepCount = recipe.steps.length
  const scale = getServingsScale(servings, recipe.servings)
  const hasMethod = stepCount > 0
  const isQuick = recipe.kind === 'quick'
  const isStepping = hasMethod && !isQuick
  const safeIndex = clampStepIndex(stepIndex, stepCount)
  const isLast = isLastStep(safeIndex, stepCount)

  const stepSwipe = useSwipe({
    onSwipeLeft: () => setStepIndex((i) => getNextStepIndex(i, stepCount)),
    onSwipeRight: () => setStepIndex((i) => getPreviousStepIndex(i, stepCount)),
  })

  useEffect(() => {
    if (!isStepping || !isActive) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setStepIndex((i) => getNextStepIndex(i, stepCount))
      if (event.key === 'ArrowLeft') setStepIndex((i) => getPreviousStepIndex(i, stepCount))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isStepping, isActive, stepCount])

  return (
    <div
      className={
        isEmbedded
          ? 'flex flex-1 flex-col min-h-0 text-ink'
          : 'fixed inset-0 z-50 flex flex-col bg-ground text-ink'
      }
      data-testid="cook-screen"
    >
      {!isEmbedded && (
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 border-b border-line">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/recipes/${recipe.id}`}
            className="flex-none min-h-11 px-3 inline-flex items-center rounded-card bg-sunken font-semibold"
            aria-label="Leave cook mode"
          >
            &times; Close
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate" data-testid="cook-title">
              {recipe.name}
            </h1>
            {isAwake && (
              <p className="text-xs text-ink-soft">Screen stays on</p>
            )}
          </div>
        </div>
        {recipe.servings ? (
          <ServingsControl servings={servings} onChange={setServings} />
        ) : (
          <p className="text-sm text-ink-soft">Amounts as written</p>
        )}
      </header>
      )}

      {isStepping && (
        <div className="h-1.5 bg-sunken " aria-hidden>
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((safeIndex + 1) / stepCount) * 100}%` }}
          />
        </div>
      )}

      {hasMethod && (
        <ActiveTimersBar
          steps={recipe.steps}
          timers={timers.timers}
          now={timers.now}
          finishedStepIds={timers.finishedStepIds}
          onGoToStep={isStepping ? setStepIndex : () => {}}
          onDismissFinished={timers.dismissFinished}
        />
      )}

      {isStepping ? (
        <div className="flex flex-1 flex-col min-h-0" {...stepSwipe}>
        <CookStepView
          isEmbedded={isEmbedded}
          step={recipe.steps[safeIndex]}
          stepNumber={safeIndex + 1}
          stepCount={stepCount}
          ingredients={recipe.ingredients}
          scale={scale}
          timer={timers.timers[recipe.steps[safeIndex].id]}
          now={timers.now}
          onStartTimer={timers.startTimer}
          onPauseTimer={timers.pauseTimer}
          onResetTimer={timers.resetTimer}
        />
        </div>
      ) : isQuick ? (
        <CookQuickView
          recipe={recipe}
          servings={servings}
          scale={scale}
          timers={timers.timers}
          now={timers.now}
          onStartTimer={timers.startTimer}
          onPauseTimer={timers.pauseTimer}
          onResetTimer={timers.resetTimer}
        />
      ) : (
        <CookNoMethod recipe={recipe} servings={servings} scale={scale} />
      )}

      {(isStepping || !isEmbedded) && (
      <nav
        className={`flex gap-3 px-4 pt-3 ${
          isEmbedded ? 'pb-1' : 'pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line bg-surface'
        }`}
        aria-label="Cook controls"
      >
        {isStepping ? (
          <>
            <button
              type="button"
              className={`${bottomButton} flex-1 bg-sunken disabled:opacity-40`}
              disabled={isFirstStep(safeIndex)}
              onClick={() => setStepIndex(getPreviousStepIndex(safeIndex, stepCount))}
            >
              Back
            </button>
            {!isEmbedded && (
              <button
                type="button"
                className={`${bottomButton} flex-none px-5 bg-accent-soft text-ink`}
                onClick={() => setIsIngredientsOpen(true)}
              >
                Ingredients
              </button>
            )}
            {isLast ? (
              <Link
                href={isEmbedded ? '/' : `/recipes/${recipe.id}`}
                className={`${bottomButton} flex-1 inline-flex items-center justify-center bg-primary text-white`}
              >
                {isEmbedded ? 'Done, back to tonight' : 'Finish'}
              </Link>
            ) : (
              <button
                type="button"
                className={`${bottomButton} flex-1 bg-accent text-ink`}
                onClick={() => setStepIndex(getNextStepIndex(safeIndex, stepCount))}
              >
                Next
              </button>
            )}
          </>
        ) : (
          <Link
            href={`/recipes/${recipe.id}`}
            className={`${bottomButton} flex-1 inline-flex items-center justify-center bg-primary text-white`}
          >
            Done
          </Link>
        )}
      </nav>
      )}

      {isIngredientsOpen && (
        <IngredientsSheet
          ingredients={recipe.ingredients}
          scale={scale}
          servings={servings}
          onClose={() => setIsIngredientsOpen(false)}
        />
      )}
    </div>
  )
}
