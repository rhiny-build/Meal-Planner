/**
 * The method-capture agent's two tools.
 *
 *   submit_method        the final answer; checks the steps and returns them (saves nothing)
 *   no_method_in_notes   the honest way out when the notes hold no cooking steps
 */

import { validateStepText } from '@/lib/recipeStepTokens'
import type { CaptureStep } from '@/lib/methodCapture/captureNotes'
import type { AgentTool } from '../loop'

type SubmittedStep = {
  text?: string
  timer_seconds?: number | null
  timer_evidence?: string | null
  from_notes?: number[]
}

const MAX_TIMER_SECONDS = 24 * 3600

/** Check Claude's steps against the recipe and the notes. Throws a message Claude can act on. */
export function buildCaptureSteps(
  input: { steps?: SubmittedStep[] },
  ingredientIds: string[],
  noteCount: number
): CaptureStep[] {
  const steps = input?.steps
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new Error('steps must be a non-empty list; use no_method_in_notes if the notes have no steps')
  }
  return steps.map((step, index) => {
    const label = `Step ${index + 1}`
    const text = typeof step.text === 'string' ? step.text.trim() : ''
    if (!text) throw new Error(`${label} has no text`)
    const check = validateStepText(text, ingredientIds)
    if (!check.valid) {
      const bad = [...check.unknownIds, ...check.malformed].join(', ')
      throw new Error(`${label} has a bad ingredient token (${bad}). Use only the listed ids.`)
    }
    const sources = Array.isArray(step.from_notes) ? step.from_notes : []
    const hasBadSource = sources.some((source) => !Number.isInteger(source) || source < 1 || source > noteCount)
    if (sources.length === 0 || hasBadSource) {
      throw new Error(`${label} must list from_notes as note numbers between 1 and ${noteCount}`)
    }
    // A timer without cited evidence is dropped: timers only where the notes support them.
    const seconds = step.timer_seconds
    const hasEvidence = typeof step.timer_evidence === 'string' && step.timer_evidence.trim() !== ''
    const isTimer =
      typeof seconds === 'number' && Number.isFinite(seconds) && seconds >= 1 && seconds <= MAX_TIMER_SECONDS
    return { text, timerSeconds: isTimer && hasEvidence ? Math.round(seconds) : null }
  })
}

export function createCaptureTools(ingredientIds: string[], noteCount: number): AgentTool[] {
  return [
    {
      name: 'no_method_in_notes',
      description: 'Call this if the notes contain no cooking steps to turn into a method.',
      inputSchema: {
        type: 'object',
        properties: { reason: { type: 'string', description: 'One plain sentence' } },
        required: ['reason'],
      },
      handler: async (input: { reason?: string }) => ({
        reason: input?.reason || 'The notes have no cooking steps.',
      }),
      givesUp: true,
    },
    {
      name: 'submit_method',
      description: 'Submit the structured method. Final answer. Nothing is saved; the cook reviews it first.',
      inputSchema: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string', description: 'Imperative step text; may contain {ing:<id>} tokens' },
                timer_seconds: { type: ['integer', 'null'], description: 'Only if the notes support a duration' },
                timer_evidence: { type: ['string', 'null'], description: 'The note text that supports the timer' },
                from_notes: {
                  type: 'array',
                  items: { type: 'integer' },
                  description: 'Numbers of the notes this step comes from',
                },
              },
              required: ['text', 'from_notes'],
            },
          },
        },
        required: ['steps'],
      },
      handler: async (input: { steps?: SubmittedStep[] }) => ({
        steps: buildCaptureSteps(input, ingredientIds, noteCount),
      }),
      endsRun: true,
    },
  ]
}
