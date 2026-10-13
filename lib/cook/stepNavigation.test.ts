import { describe, it, expect } from 'vitest'
import {
  clampStepIndex,
  getNextStepIndex,
  getPreviousStepIndex,
  isFirstStep,
  isLastStep,
} from './stepNavigation'

describe('step navigation', () => {
  it('should move forward one step', () => {
    expect(getNextStepIndex(0, 5)).toBe(1)
  })

  it('should stay on the last step when moving forward from it', () => {
    expect(getNextStepIndex(4, 5)).toBe(4)
  })

  it('should move back one step', () => {
    expect(getPreviousStepIndex(3, 5)).toBe(2)
  })

  it('should stay on the first step when moving back from it', () => {
    expect(getPreviousStepIndex(0, 5)).toBe(0)
  })

  it('should clamp out-of-range, fractional and invalid indexes', () => {
    expect(clampStepIndex(99, 5)).toBe(4)
    expect(clampStepIndex(-3, 5)).toBe(0)
    expect(clampStepIndex(2.7, 5)).toBe(2)
    expect(clampStepIndex(NaN, 5)).toBe(0)
  })

  it('should return 0 when there are no steps', () => {
    expect(clampStepIndex(3, 0)).toBe(0)
    expect(getNextStepIndex(0, 0)).toBe(0)
  })

  it('should know the first and last steps', () => {
    expect(isFirstStep(0)).toBe(true)
    expect(isFirstStep(1)).toBe(false)
    expect(isLastStep(4, 5)).toBe(true)
    expect(isLastStep(3, 5)).toBe(false)
    expect(isLastStep(0, 1)).toBe(true)
  })
})
