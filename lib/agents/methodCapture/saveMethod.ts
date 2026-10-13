/**
 * Save a reviewed captured method onto a recipe, through the existing recipe write path
 * (updateRecipeFromForm). A recipe that already has steps is never touched.
 */

import { prisma } from '@/lib/prisma'
import { updateRecipeFromForm, RecipeValidationError } from '@/lib/recipeWrite'
import type { CaptureStep } from '@/lib/methodCapture/captureNotes'

export class MethodAlreadyExistsError extends Error {}

export async function saveCapturedMethod(recipeId: string, steps: CaptureStep[]) {
  const usableSteps = steps.filter((step) => typeof step?.text === 'string' && step.text.trim() !== '')
  if (usableSteps.length === 0) throw new RecipeValidationError('Add at least one step before saving')
  const existingCount = await prisma.recipeStep.count({ where: { recipeId } })
  if (existingCount > 0) {
    throw new MethodAlreadyExistsError('This recipe already has a method, so nothing was changed')
  }
  return updateRecipeFromForm(prisma, recipeId, {
    steps: usableSteps.map((step) => ({ text: step.text, timerSeconds: step.timerSeconds ?? null })),
  })
}
