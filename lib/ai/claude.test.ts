import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAnthropic = vi.hoisted(() => ({ messages: { create: vi.fn() } }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = mockAnthropic.messages
  },
}))

import { callForcedTool } from './claude'
import { cachedSystem, withConversationCache } from './cache'

describe('callForcedTool', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends the system prompt as a cache-marked block', async () => {
    mockAnthropic.messages.create.mockResolvedValue({
      content: [{ type: 'tool_use', id: 't', name: 'out', input: { ok: true } }],
    })

    const result = await callForcedTool({
      model: 'm',
      system: 'be brief',
      prompt: 'hi',
      maxTokens: 10,
      toolName: 'out',
      toolDescription: 'd',
      schema: { type: 'object' },
    })

    expect(result).toEqual({ ok: true })
    const request = mockAnthropic.messages.create.mock.calls[0][0]
    expect(request.system).toEqual([
      { type: 'text', text: 'be brief\n\nRespond only by calling the out tool.', cache_control: { type: 'ephemeral' } },
    ])
  })
})

describe('cache helpers', () => {
  it('cachedSystem wraps text in one marked block', () => {
    expect(cachedSystem('x')).toEqual([{ type: 'text', text: 'x', cache_control: { type: 'ephemeral' } }])
  })

  it('withConversationCache marks only the last block and does not mutate the input', () => {
    const messages = [
      { role: 'user' as const, content: 'a' },
      { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'b' }] },
    ]
    const out = withConversationCache(messages)
    expect(out[1].content).toEqual([{ type: 'text', text: 'b', cache_control: { type: 'ephemeral' } }])
    expect(out[0]).toBe(messages[0])
    expect(messages[1].content).toEqual([{ type: 'text', text: 'b' }])
  })
})
