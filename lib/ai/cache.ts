/**
 * Prompt caching helpers.
 *
 * The API caches everything before a `cache_control` marker (order: tools, then system, then
 * messages). A repeat request with the same prefix reads it back at a fraction of the input price.
 * Cached prefixes need at least 512 tokens on Sonnet 5.5 and Haiku 5.5; shorter ones are simply
 * not cached, so marking them is harmless.
 * Docs: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
 *
 * We use explicit markers (the SDK types have no top-level `cache_control` yet):
 *   1. on the system prompt  -> caches the tool definitions and the system prompt
 *   2. on the last message   -> caches the conversation so far, moving forward each turn
 */

import type Anthropic from '@anthropic-ai/sdk'

const EPHEMERAL = { type: 'ephemeral' } as const

/** The system prompt as a single cached block (tools placed before it are cached with it). */
export function cachedSystem(text: string): Anthropic.TextBlockParam[] {
  return [{ type: 'text', text, cache_control: EPHEMERAL }]
}

/**
 * A copy of the conversation with a cache marker on its final block. Copies, never mutates, so
 * markers from earlier turns do not pile up (the API allows at most 4 per request).
 */
export function withConversationCache(messages: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  if (messages.length === 0) return messages
  const last = messages[messages.length - 1]
  const blocks: Anthropic.ContentBlockParam[] =
    typeof last.content === 'string' ? [{ type: 'text', text: last.content }] : [...last.content]
  if (blocks.length === 0) return messages
  const tail = blocks[blocks.length - 1]
  // Thinking blocks cannot carry a marker; fall back to leaving the request as it is.
  if (tail.type === 'thinking' || tail.type === 'redacted_thinking') return messages
  blocks[blocks.length - 1] = { ...tail, cache_control: EPHEMERAL }
  return [...messages.slice(0, -1), { ...last, content: blocks }]
}
