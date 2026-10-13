/**
 * Claude list prices, USD per million tokens. Used only to show an estimated cost on admin screens.
 * Source: docs/rehaul/logs/RUN-cost-caching-haiku.md. Update here when prices or models change.
 */

import { CLAUDE_MODELS } from './config'

export type TokenUsage = {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
}

type ModelPrice = { input: number; output: number; cacheRead: number; cacheWrite: number }

const PRICES_PER_MILLION_TOKENS: Record<string, ModelPrice> = {
  [CLAUDE_MODELS.agent]: { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  [CLAUDE_MODELS.cheap]: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
}

/** Estimated cost in USD, or null when the model has no known price. */
export function estimateTokenCostUsd(model: string, usage: TokenUsage): number | null {
  const price = PRICES_PER_MILLION_TOKENS[model]
  if (!price) return null
  return (
    (usage.inputTokens * price.input +
      usage.outputTokens * price.output +
      usage.cacheReadTokens * price.cacheRead +
      usage.cacheCreationTokens * price.cacheWrite) /
    1_000_000
  )
}
