/**
 * Method-capture agent: cooking notes in, a DRAFT method out (nothing is saved here).
 * One short run of the generic loop in ../loop.ts, recorded on /agent-runs with trigger `manual`.
 */

import { AI_CONFIG } from '@/lib/ai/config'
import { prisma } from '@/lib/prisma'
import { formatNotesForPrompt, type CaptureNote, type CaptureStep } from '@/lib/methodCapture/captureNotes'
import { runAgent } from '../loop'
import { buildCaptureSystemPrompt, buildCaptureUserMessage } from './prompt'
import { createCaptureTools } from './tools'

export const METHOD_CAPTURE_AGENT = 'method-capture'

export class CaptureNotAllowedError extends Error {}

export async function runMethodCapture(
  recipeId: string,
  notes: Pick<CaptureNote, 'at' | 'text'>[],
  model?: string
) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { structuredIngredients: { orderBy: { order: 'asc' } }, _count: { select: { steps: true } } },
  })
  if (!recipe) throw new CaptureNotAllowedError('Recipe not found')
  if (recipe._count.steps > 0) throw new CaptureNotAllowedError('This recipe already has a method')

  const config = AI_CONFIG.methodCapture
  const ingredients = recipe.structuredIngredients
  const notesText = formatNotesForPrompt(notes.map((note, index) => ({ id: String(index), ...note })))
  return runAgent<{ steps: CaptureStep[] }>({
    agent: METHOD_CAPTURE_AGENT,
    trigger: 'manual',
    input: { recipeId, recipeName: recipe.name, notes },
    model: model ?? config.model,
    maxTokens: config.maxTokens,
    maxTurns: config.maxTurns,
    system: buildCaptureSystemPrompt(),
    userMessage: buildCaptureUserMessage(recipe.name, ingredients, notesText),
    tools: createCaptureTools(
      ingredients.map((ingredient) => ingredient.id),
      notes.length
    ),
  })
}
