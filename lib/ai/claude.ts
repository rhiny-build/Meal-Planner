/**
 * Claude client and structured-output helper.
 *
 * Structured output works by giving the model ONE tool (and telling it to call it) whose
 * input_schema is the JSON shape we want. The API then returns a `tool_use`
 * block whose `input` is already a parsed object, so there is no JSON-in-text
 * parsing, no markdown fences, and no "return ONLY JSON" prompt pleading.
 */

import Anthropic from '@anthropic-ai/sdk'
import { cachedSystem } from './cache'

let client: Anthropic | undefined

/** Lazily created so importing this module never needs the API key (builds, tests). */
export function getAnthropic(): Anthropic {
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return client
}

export interface ForcedToolCall {
  model: string
  system: string
  /** User message content */
  prompt: string
  maxTokens: number
  /** Name of the single tool the model must call */
  toolName: string
  toolDescription: string
  /** JSON schema for the tool input (i.e. the shape of the result) */
  schema: Anthropic.Tool.InputSchema
  /** Called with the token usage of the response, for callers that track spend */
  onUsage?: (usage: Anthropic.Usage) => void
}

/**
 * Call Claude with a single result tool and return the tool's input.
 * Throws if the model does not return a tool_use block.
 */
export async function callForcedTool<T>(params: ForcedToolCall): Promise<T> {
  const message = await getAnthropic().messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    system: cachedSystem(`${params.system}\n\nRespond only by calling the ${params.toolName} tool.`),
    messages: [{ role: 'user', content: params.prompt }],
    tools: [
      {
        name: params.toolName,
        description: params.toolDescription,
        input_schema: params.schema,
      },
    ],
    // tool_choice stays "auto": claude-sonnet-5-5 rejects type "tool"/"any".
    // With one tool and the instruction below, the model reliably calls it.
    tool_choice: { type: 'auto' },
  })

  params.onUsage?.(message.usage)
  const block = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === params.toolName
  )
  if (!block) {
    throw new Error(`Claude did not return the ${params.toolName} tool call`)
  }
  return block.input as T
}
