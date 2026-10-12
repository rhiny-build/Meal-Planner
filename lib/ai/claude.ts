/**
 * Claude client and structured-output helper.
 *
 * Structured output works by forcing the model to call ONE tool whose
 * input_schema is the JSON shape we want. The API then returns a `tool_use`
 * block whose `input` is already a parsed object, so there is no JSON-in-text
 * parsing, no markdown fences, and no "return ONLY JSON" prompt pleading.
 */

import Anthropic from '@anthropic-ai/sdk'

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
}

/**
 * Call Claude with a single forced tool and return the tool's input.
 * Throws if the model does not return a tool_use block.
 */
export async function callForcedTool<T>(params: ForcedToolCall): Promise<T> {
  const message = await getAnthropic().messages.create({
    model: params.model,
    max_tokens: params.maxTokens,
    system: params.system,
    messages: [{ role: 'user', content: params.prompt }],
    tools: [
      {
        name: params.toolName,
        description: params.toolDescription,
        input_schema: params.schema,
      },
    ],
    tool_choice: { type: 'tool', name: params.toolName },
  })

  const block = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === params.toolName
  )
  if (!block) {
    throw new Error(`Claude did not return the ${params.toolName} tool call`)
  }
  return block.input as T
}
