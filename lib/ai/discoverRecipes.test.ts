import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAnthropic = vi.hoisted(() => ({ messages: { create: vi.fn() } }))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = mockAnthropic.messages
  },
}))

import { discoverRecipes } from '@/lib/ai/discoverRecipes'

const recipe = {
  name: 'Lemon Chicken',
  recipeUrl: 'https://example.com/lemon-chicken',
  ingredients: 'chicken\nlemon',
  proteinType: 'chicken',
  carbType: null,
  prepTime: 'quick',
  tier: 'new',
}

describe('discoverRecipes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marks the system prompt and the prompt for caching', async () => {
    mockAnthropic.messages.create.mockResolvedValue({
      stop_reason: 'tool_use',
      content: [{ type: 'tool_use', id: 't1', name: 'submit_recipes', input: { recipes: [] } }],
    })

    await discoverRecipes('quick chicken')

    const request = mockAnthropic.messages.create.mock.calls[0][0]
    expect(request.system[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(request.messages[0].content[0]).toMatchObject({ text: 'quick chicken', cache_control: { type: 'ephemeral' } })
  })

  it('offers web search and returns recipes from submit_recipes', async () => {
    mockAnthropic.messages.create.mockResolvedValue({
      stop_reason: 'tool_use',
      content: [
        { type: 'server_tool_use', name: 'web_search' },
        { type: 'tool_use', id: 't1', name: 'submit_recipes', input: { recipes: [recipe] } },
      ],
    })

    const result = await discoverRecipes('quick chicken')

    expect(result).toEqual([recipe])
    const tools = mockAnthropic.messages.create.mock.calls[0][0].tools
    expect(tools.some((t: { name: string }) => t.name === 'web_search')).toBe(true)
  })

  it('continues after pause_turn', async () => {
    mockAnthropic.messages.create
      .mockResolvedValueOnce({ stop_reason: 'pause_turn', content: [{ type: 'text', text: '...' }] })
      .mockResolvedValueOnce({
        stop_reason: 'tool_use',
        content: [{ type: 'tool_use', id: 't1', name: 'submit_recipes', input: { recipes: [recipe] } }],
      })

    const result = await discoverRecipes('quick chicken')

    expect(result).toHaveLength(1)
    expect(mockAnthropic.messages.create).toHaveBeenCalledTimes(2)
  })

  it('throws when Claude never submits recipes', async () => {
    mockAnthropic.messages.create.mockResolvedValue({
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'here you go' }],
    })

    await expect(discoverRecipes('x')).rejects.toThrow('did not return recipes')
  })
})
