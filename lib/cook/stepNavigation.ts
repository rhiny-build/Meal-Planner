/**
 * Cook mode step navigation (pure functions)
 */

/** Keep a step index inside 0..stepCount-1 (0 when there are no steps). */
export function clampStepIndex(index: number, stepCount: number): number {
  if (stepCount <= 0 || !Number.isFinite(index)) return 0
  return Math.min(Math.max(Math.trunc(index), 0), stepCount - 1)
}

export function getNextStepIndex(index: number, stepCount: number): number {
  return clampStepIndex(index + 1, stepCount)
}

export function getPreviousStepIndex(index: number, stepCount: number): number {
  return clampStepIndex(index - 1, stepCount)
}

export function isFirstStep(index: number): boolean {
  return index <= 0
}

export function isLastStep(index: number, stepCount: number): boolean {
  return index >= stepCount - 1
}
