/**
 * CookScreen
 *
 * The full-screen cook mode for one recipe. Owns the state that must survive
 * changing step: current step, chosen servings and (via useCookTimers) every
 * timer. Picks the view: one step per screen for a recipe with a method, a
 * one-screen view for quick recipes, ingredients plus a note when there is
 * no method.
 */

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useCookTimers } from '@/lib/cook/useCookTimers'
import { useScreenWakeLock } from '@/lib/cook/useScreenWakeLock'
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
}

const bottomButton = 'min-h-16 rounded-2xl text-xl font-bold'

export default function CookScreen({ recipe }: CookScreenProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [servings, setServings] = useState(recipe.servings ?? 1)
  const [isIngredientsOpen, setIsIngredientsOpen] = useState(false)
  const timers = useCookTimers()
  const isAwake = useScreenWakeLock()

  const stepCount = recipe.steps.length
  const scale = getServingsScale(servings, recipe.servings)
  const hasMethod = stepCount > 0
  const isQuick = recipe.kind === 'quick'
  const isStepping = hasMethod && !isQuick
  const safeIndex = clampStepIndex(stepIndex, stepCount)
  const isLast = isLastStep(safeIndex, stepCount)

  useEffect(() => {
    if (!isStepping) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setStepIndex((i) => getNextStepIndex(i, stepCount))
      if (event.key === 'ArrowLeft') setStepIndex((i) => getPreviousStepIndex(i, stepCount))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isStepping, stepCount])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100"
      data-testid="cook-screen"
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 border-b border-gray-200 dark:border-neutral-700">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/recipes/${recipe.id}`}
            className="flex-none min-h-11 px-3 inline-flex items-center rounded-xl bg-gray-200 dark:bg-neutral-700 font-semibold"
            aria-label="Leave cook mode"
          >
            &times; Close
          </Link>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate" data-testid="cook-title">
              {recipe.name}
            </h1>
            {isAwake && (
              <p className="text-xs text-gray-500 dark:text-neutral-400">Screen stays on</p>
            )}
          </div>
        </div>
        {recipe.servings ? (
          <ServingsControl servings={servings} onChange={setServings} />
        ) : (
          <p className="text-sm text-gray-600 dark:text-neutral-400">Amounts as written</p>
        )}
      </header>

      {isStepping && (
        <div className="h-1.5 bg-gray-200 dark:bg-neutral-700" aria-hidden>
          <div
            className="h-full bg-blue-600 dark:bg-fuchsia-500 transition-all"
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
        <CookStepView
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

      <nav
        className="flex gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-gray-200 dark:border-neutral-700"
        aria-label="Cook controls"
      >
        {isStepping ? (
          <>
            <button
              type="button"
              className={`${bottomButton} flex-1 bg-gray-200 dark:bg-neutral-700 disabled:opacity-40`}
              disabled={isFirstStep(safeIndex)}
              onClick={() => setStepIndex(getPreviousStepIndex(safeIndex, stepCount))}
            >
              Back
            </button>
            <button
              type="button"
              className={`${bottomButton} flex-none px-5 bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100`}
              onClick={() => setIsIngredientsOpen(true)}
            >
              Ingredients
            </button>
            {isLast ? (
              <Link
                href={`/recipes/${recipe.id}`}
                className={`${bottomButton} flex-1 inline-flex items-center justify-center bg-green-600 text-white`}
              >
                Finish
              </Link>
            ) : (
              <button
                type="button"
                className={`${bottomButton} flex-1 bg-blue-600 dark:bg-fuchsia-600 text-white`}
                onClick={() => setStepIndex(getNextStepIndex(safeIndex, stepCount))}
              >
                Next
              </button>
            )}
          </>
        ) : (
          <Link
            href={`/recipes/${recipe.id}`}
            className={`${bottomButton} flex-1 inline-flex items-center justify-center bg-green-600 text-white`}
          >
            Done
          </Link>
        )}
      </nav>

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
