import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    agentRun: { create: vi.fn(), update: vi.fn() },
    agentStep: { create: vi.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { startRun } from './runLog'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(prisma.agentRun.create).mockResolvedValue({ id: 'run_1' } as any)
})

describe('runLog', () => {
  it('creates the run row with agent, trigger and input', async () => {
    const run = await startRun({ agent: 'recipe-importer', trigger: 'manual', input: { url: 'u' } })

    expect(run.id).toBe('run_1')
    expect(prisma.agentRun.create).toHaveBeenCalledWith({
      data: { agent: 'recipe-importer', trigger: 'manual', input: { url: 'u' } },
    })
  })

  it('numbers steps 0, 1, 2 and stores tool name, payload and tokens', async () => {
    const run = await startRun({ agent: 'a', trigger: 'manual', input: {} })
    await run.step('model', { content: [] }, { tokens: { inputTokens: 100, outputTokens: 20 } })
    await run.step('tool_call', { id: 't', input: { q: 1 } }, { toolName: 'lookup' })
    await run.step('tool_result', { output: 'x' }, { toolName: 'lookup' })

    const calls = vi.mocked(prisma.agentStep.create).mock.calls.map((c) => c[0].data)
    expect(calls.map((d) => d.order)).toEqual([0, 1, 2])
    expect(calls[0]).toMatchObject({ runId: 'run_1', kind: 'model', toolName: null, inputTokens: 100, outputTokens: 20 })
    expect(calls[1]).toMatchObject({ kind: 'tool_call', toolName: 'lookup', inputTokens: null })
  })

  it('finish stores output, succeeded status and summed token totals', async () => {
    const run = await startRun({ agent: 'a', trigger: 'manual', input: {} })
    await run.step('model', {}, { tokens: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 5 } })
    await run.step('model', {}, { tokens: { inputTokens: 50, outputTokens: 10 } })
    await run.finish({ draft: 1 })

    const update = vi.mocked(prisma.agentRun.update).mock.calls[0][0]
    expect(update.where).toEqual({ id: 'run_1' })
    expect(update.data).toMatchObject({
      status: 'succeeded',
      output: { draft: 1 },
      inputTokens: 150,
      outputTokens: 30,
      cacheReadTokens: 5,
      cacheCreationTokens: 0,
    })
    expect(update.data.finishedAt).toBeInstanceOf(Date)
  })

  it('fail stores the error and failed status', async () => {
    const run = await startRun({ agent: 'a', trigger: 'manual', input: {} })
    await run.fail('boom')

    expect(vi.mocked(prisma.agentRun.update).mock.calls[0][0].data).toMatchObject({
      status: 'failed',
      error: 'boom',
    })
  })
})
