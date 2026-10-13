import { describe, expect, it } from 'vitest'
import { CLAUDE_MODELS } from './config'
import { estimateTokenCostUsd } from './pricing'

const usage = { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheReadTokens: 1_000_000, cacheCreationTokens: 1_000_000 }

describe('estimateTokenCostUsd', () => {
  it('prices Haiku per million tokens, cache included', () => {
    expect(estimateTokenCostUsd(CLAUDE_MODELS.cheap, usage)).toBeCloseTo(0.1 + 0.5 + 0.01 + 0.125)
  })

  it('prices Sonnet per million tokens, cache included', () => {
    expect(estimateTokenCostUsd(CLAUDE_MODELS.agent, usage)).toBeCloseTo(2 + 10 + 0.1 + 2.5)
  })

  it('returns null for a model with no known price', () => {
    expect(estimateTokenCostUsd('some-other-model', usage)).toBeNull()
  })
})
