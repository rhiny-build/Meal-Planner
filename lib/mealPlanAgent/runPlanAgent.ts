/**
 * The meal-plan agent, on the Anthropic SDK's tool runner (decision D7). Two jobs share it:
 *   - "ask":   one change in plain words ("swap Wednesday for fish"), applied to the saved plan or to a pending draft
 *   - "draft": fill the empty dinner slots of a week, with a reason per day, into a draft
 * The tool runner owns the loop (call Claude, run the tools it asks for, send the results back, repeat until
 * Claude stops asking). We only watch the messages it yields, to write the run log and count tokens.
 */

import type Anthropic from '@anthropic-ai/sdk'
import type { PrismaClient } from '@prisma/client'
import { getAnthropic } from '@/lib/ai/claude'
import { cachedSystem } from '@/lib/ai/cache'
import { AI_CONFIG } from '@/lib/ai/config'
import { startRun, type RunTrigger } from '@/lib/agents/runLog'
import { createPlanAgentTools, type SlotChange } from './agentTools'
import { ASK_SYSTEM, DRAFT_SYSTEM, askUserMessage, draftUserMessage } from './prompts'
import { addDays } from './dates'
import type { PlanStore } from './types'

export const PLAN_AGENT = 'meal-plan'

export interface PlanAgentResult {
  runId: string
  ok: boolean
  /** The agent's own one-line description of what it did (safe to show) */
  message: string
  changes: SlotChange[]
  error?: string
  tokens: { input: number; output: number }
}

interface BaseParams {
  prisma: PrismaClient
  store: PlanStore
  today: string
  weekStart: string
  trigger?: RunTrigger
  /** Test seam: a different client (the replayed-response tests pass a fake) */
  client?: Anthropic
}

export type PlanAgentParams =
  | (BaseParams & { mode: 'ask'; instruction: string })
  | (BaseParams & { mode: 'draft' })

const textOf = (message: Anthropic.Beta.Messages.BetaMessage): string =>
  message.content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === 'text')
    .map(b => b.text)
    .join(' ')
    .trim()

export async function runPlanAgent(params: PlanAgentParams): Promise<PlanAgentResult> {
  const { prisma, store, today, weekStart } = params
  const weekEnd = addDays(weekStart, 6)
  const config = AI_CONFIG.mealPlanAgent
  const run = await startRun({
    agent: PLAN_AGENT,
    trigger: params.trigger ?? 'manual',
    input: { mode: params.mode, weekStart, source: store.kind, ...(params.mode === 'ask' ? { instruction: params.instruction } : {}) },
  })
  const { tools, changes } = createPlanAgentTools(prisma, store, run, today)
  const tokens = { input: 0, output: 0 }

  const userMessage =
    params.mode === 'ask'
      ? askUserMessage({ instruction: params.instruction, today, weekStart, weekEnd, source: store.kind })
      : draftUserMessage({ today, weekStart, weekEnd, recentFrom: addDays(weekStart, -28) })

  try {
    const runner = (params.client ?? getAnthropic()).beta.messages.toolRunner({
      model: config.model,
      max_tokens: config.maxTokens,
      max_iterations: config.maxIterations,
      // No thinking before replying (this model's way to turn it off): choosing recipes from search results does not need it
      thinking: { type: 'between_tools' } as never,
      system: cachedSystem(params.mode === 'ask' ? ASK_SYSTEM : DRAFT_SYSTEM),
      messages: [{ role: 'user', content: userMessage }],
      tools,
    })

    let lastMessage = ''
    let lastStop: string | null = null
    for await (const message of runner) {
      const usage = message.usage
      tokens.input += usage.input_tokens + (usage.cache_creation_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0)
      tokens.output += usage.output_tokens
      await run.step('model', { content: message.content, stop_reason: message.stop_reason }, {
        tokens: {
          inputTokens: usage.input_tokens, outputTokens: usage.output_tokens,
          cacheReadTokens: usage.cache_read_input_tokens ?? 0, cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
        },
      })
      lastMessage = textOf(message) || lastMessage
      lastStop = message.stop_reason
    }

    // The runner stops quietly at max_iterations; a last reply that still wanted tools means the job was not finished
    if (lastStop === 'tool_use') throw new Error('The agent ran out of steps before it finished')

    // The prompt asks for one sentence; if the model wrote more, the last paragraph is the summary
    const paragraphs = lastMessage.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
    const message = paragraphs[paragraphs.length - 1] || (changes.length ? 'Done.' : 'Nothing was changed.')
    await run.finish({ message, changes })
    return { runId: run.id, ok: true, message, changes, tokens }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'The agent failed'
    await run.fail(error)
    return { runId: run.id, ok: false, message: '', changes, error, tokens }
  }
}
