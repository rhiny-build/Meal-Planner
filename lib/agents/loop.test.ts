/**
 * Agent loop tests. Claude is a scripted fake: each call to messages.create returns
 * the next canned response. The run log is an in-memory fake too, so we can read back
 * exactly what the loop recorded.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAnthropic = vi.hoisted(() => ({ messages: { create: vi.fn() } }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = mockAnthropic.messages
  },
}))

const log = vi.hoisted(() => ({
  steps: [] as Array<{ kind: string; payload: any; toolName?: string }>,
  finished: undefined as unknown,
  failed: undefined as string | undefined,
}))
vi.mock('./runLog', () => ({
  startRun: vi.fn(async () => ({
    id: 'run_1',
    step: async (kind: string, payload: unknown, options: { toolName?: string } = {}) => {
      log.steps.push({ kind, payload, toolName: options.toolName })
    },
    finish: async (output: unknown) => {
      log.finished = output
    },
    fail: async (error: string) => {
      log.failed = error
    },
  })),
}))

import { runAgent, type AgentTool } from './loop'

const usage = { input_tokens: 10, output_tokens: 5 }
const toolUse = (id: string, name: string, input: unknown) => ({
  type: 'tool_use',
  id,
  name,
  input,
})
const reply = (content: unknown[], stop_reason = 'tool_use') => ({ content, stop_reason, usage })

const lookup = vi.fn(async (input: { q: string }) => ({ found: input.q }))
const submit = vi.fn(async (input: { answer: string }) => ({ final: input.answer }))

const giveUp = vi.fn(async (input: { reason: string }) => ({ reason: input.reason }))
const tools: AgentTool[] = [
  { name: 'give_up', description: 'give up', inputSchema: { type: 'object' }, handler: giveUp, givesUp: true },
  { name: 'lookup', description: 'look', inputSchema: { type: 'object' }, handler: lookup },
  { name: 'submit', description: 'submit', inputSchema: { type: 'object' }, handler: submit, endsRun: true },
]

const params = {
  agent: 'test',
  trigger: 'manual' as const,
  input: { x: 1 },
  model: 'm',
  maxTokens: 100,
  system: 'sys',
  userMessage: 'do it',
  tools,
  maxTurns: 5,
}

beforeEach(() => {
  vi.clearAllMocks()
  log.steps = []
  log.finished = undefined
  log.failed = undefined
})

describe('runAgent', () => {
  it('runs tools, feeds results back, and stops when the final tool succeeds', async () => {
    mockAnthropic.messages.create
      .mockResolvedValueOnce(reply([toolUse('t1', 'lookup', { q: 'a' })]))
      .mockResolvedValueOnce(reply([toolUse('t2', 'submit', { answer: 'done' })]))

    const result = await runAgent<{ final: string }>(params)

    expect(result).toEqual({ runId: 'run_1', ok: true, output: { final: 'done' } })
    expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(2)
    expect(log.finished).toEqual({ final: 'done' })

    // The second model call saw Claude's tool call and our tool result
    const secondCall = mockAnthropic.messages.create.mock.calls[1][0]
    expect(secondCall.tool_choice).toEqual({ type: 'auto' })
    // (the messages array is shared and keeps growing, so read the entry added before call 2: index 2)
    const last = secondCall.messages[2]
    expect(last.role).toBe('user')
    expect(last.content[0]).toMatchObject({
      type: 'tool_result',
      tool_use_id: 't1',
      content: JSON.stringify({ found: 'a' }),
      is_error: false,
    })
  })

  it('records every model turn, tool call and tool result in order', async () => {
    mockAnthropic.messages.create
      .mockResolvedValueOnce(reply([toolUse('t1', 'lookup', { q: 'a' })]))
      .mockResolvedValueOnce(reply([toolUse('t2', 'submit', { answer: 'done' })]))

    await runAgent(params)

    expect(log.steps.map((s) => [s.kind, s.toolName])).toEqual([
      ['model', undefined],
      ['tool_call', 'lookup'],
      ['tool_result', 'lookup'],
      ['model', undefined],
      ['tool_call', 'submit'],
      ['tool_result', 'submit'],
    ])
    expect(log.steps[1].payload).toEqual({ id: 't1', input: { q: 'a' } })
    expect(log.steps[2].payload).toEqual({ output: { found: 'a' }, isError: false })
  })

  it('fails the run when maxTurns is reached without a final answer', async () => {
    mockAnthropic.messages.create.mockResolvedValue(reply([toolUse('t', 'lookup', { q: 'a' })]))

    const result = await runAgent({ ...params, maxTurns: 3 })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('3 turns')
    expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(3)
    expect(lookup).toHaveBeenCalledTimes(3)
    expect(log.failed).toContain('3 turns')
  })

  it('tells the model about a tool error and lets it carry on', async () => {
    submit.mockRejectedValueOnce(new Error('name is required'))
    mockAnthropic.messages.create
      .mockResolvedValueOnce(reply([toolUse('t1', 'submit', { answer: '' })]))
      .mockResolvedValueOnce(reply([toolUse('t2', 'submit', { answer: 'fixed' })]))

    const result = await runAgent<{ final: string }>(params)

    expect(result.ok).toBe(true)
    expect(result.output).toEqual({ final: 'fixed' })
    const secondCall = mockAnthropic.messages.create.mock.calls[1][0]
    const toolResult = secondCall.messages[2].content[0]
    expect(toolResult.is_error).toBe(true)
    expect(toolResult.content).toContain('name is required')
  })

  it('reports an unknown tool back to the model instead of crashing', async () => {
    mockAnthropic.messages.create
      .mockResolvedValueOnce(reply([toolUse('t1', 'nope', {})]))
      .mockResolvedValueOnce(reply([toolUse('t2', 'submit', { answer: 'ok' })]))

    const result = await runAgent(params)

    expect(result.ok).toBe(true)
    expect(log.steps[2].payload.isError).toBe(true)
  })

  it('fails the run with the agent\'s own reason when it gives up', async () => {
    mockAnthropic.messages.create.mockResolvedValueOnce(
      reply([toolUse('t1', 'give_up', { reason: 'the page has no recipe' })])
    )

    const result = await runAgent(params)

    expect(result).toEqual({
      runId: 'run_1',
      ok: false,
      error: 'The agent gave up: the page has no recipe',
      gaveUpReason: 'the page has no recipe',
    })
    expect(log.failed).toBe('The agent gave up: the page has no recipe')
    expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(1)
  })

  it('nudges once when the model ends its turn with no tool call, then succeeds', async () => {
    mockAnthropic.messages.create
      .mockResolvedValueOnce(reply([{ type: 'text', text: 'Here you go' }], 'end_turn'))
      .mockResolvedValueOnce(reply([toolUse('t1', 'submit', { answer: 'now' })]))

    const result = await runAgent<{ final: string }>(params)

    expect(result.ok).toBe(true)
    expect(log.steps.map((s) => s.kind)).toEqual(['model', 'note', 'model', 'tool_call', 'tool_result'])
    const secondCall = mockAnthropic.messages.create.mock.calls[1][0]
    const last = secondCall.messages[2]
    expect(last).toEqual({ role: 'user', content: expect.stringContaining('submit') })
  })

  it('fails cleanly when the model ignores the nudge too', async () => {
    mockAnthropic.messages.create.mockResolvedValue(reply([{ type: 'text', text: 'hm' }], 'end_turn'))

    const result = await runAgent(params)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('without calling submit')
    expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(2)
    expect(log.failed).toContain('without calling submit')
  })

  it('fails without running a tool when the reply was cut off by max_tokens', async () => {
    mockAnthropic.messages.create.mockResolvedValue(
      reply([toolUse('t1', 'lookup', { q: 'a' })], 'max_tokens')
    )

    const result = await runAgent(params)

    expect(result.ok).toBe(false)
    expect(result.error).toContain('output tokens')
    expect(lookup).not.toHaveBeenCalled()
  })

  it('fails the run (with its id) when the API call throws', async () => {
    mockAnthropic.messages.create.mockRejectedValue(new Error('overloaded'))

    const result = await runAgent(params)

    expect(result).toEqual({ runId: 'run_1', ok: false, error: 'overloaded' })
    expect(log.failed).toBe('overloaded')
  })
})
