/**
 * Agent run log
 *
 * Every agent run is written to the database so it can be read back on /agent-runs:
 * one AgentRun row (the header) plus ordered AgentStep rows (what happened).
 *
 *   const run = await startRun({ agent, trigger, input })
 *   await run.step('model', { content }, { tokens })
 *   await run.step('tool_call', { id, input }, { toolName })
 *   await run.step('tool_result', { output }, { toolName })
 *   await run.finish(output)      // or: await run.fail(message)
 *
 * Step kinds: `model`, `tool_call`, `tool_result`, plus `note` for anything the loop
 * itself did (for example the nudge it sends when the model forgets to submit).
 * Step order is a contiguous 0-based counter kept by the handle.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type RunTrigger = 'manual' | 'batch' | 'schedule' | 'mcp'
export type StepKind = 'model' | 'tool_call' | 'tool_result' | 'note'

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheReadTokens?: number
  cacheCreationTokens?: number
}

export interface StepOptions {
  toolName?: string
  tokens?: TokenUsage
}

export interface RunHandle {
  id: string
  /** Append the next step (order is assigned automatically). */
  step(kind: StepKind, payload: unknown, options?: StepOptions): Promise<void>
  /** Mark the run succeeded and store its final output and token totals. */
  finish(output: unknown): Promise<void>
  /** Mark the run failed and store why. */
  fail(error: string): Promise<void>
}

/** Make sure a payload is plain JSON (drops undefined, class instances, etc.). */
function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue
}

export async function startRun(params: {
  agent: string
  trigger: RunTrigger
  input: unknown
}): Promise<RunHandle> {
  const row = await prisma.agentRun.create({
    data: { agent: params.agent, trigger: params.trigger, input: toJson(params.input) },
  })

  let nextOrder = 0
  const totals = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheCreationTokens: 0 }

  async function close(data: Prisma.AgentRunUpdateInput) {
    await prisma.agentRun.update({
      where: { id: row.id },
      data: { ...data, ...totals, finishedAt: new Date() },
    })
  }

  return {
    id: row.id,

    async step(kind, payload, options = {}) {
      const tokens = options.tokens
      if (tokens) {
        totals.inputTokens += tokens.inputTokens
        totals.outputTokens += tokens.outputTokens
        totals.cacheReadTokens += tokens.cacheReadTokens ?? 0
        totals.cacheCreationTokens += tokens.cacheCreationTokens ?? 0
      }
      await prisma.agentStep.create({
        data: {
          runId: row.id,
          order: nextOrder++,
          kind,
          toolName: options.toolName ?? null,
          payload: toJson(payload),
          inputTokens: tokens?.inputTokens ?? null,
          outputTokens: tokens?.outputTokens ?? null,
        },
      })
    },

    finish: (output) => close({ status: 'succeeded', output: toJson(output) }),

    fail: (error) => close({ status: 'failed', error }),
  }
}
