/**
 * A real Anthropic SDK client whose HTTP layer replays scripted responses, so the tool runner, the tool wrappers and the
 * run log are all exercised exactly as in production, without a network or an API key.
 * Each call to `script` receives the request the SDK just made and returns the assistant's content blocks.
 */
import Anthropic from '@anthropic-ai/sdk'

type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }

export interface ScriptedRequest {
  turn: number
  /** The messages the SDK sent (assistant tool_use / user tool_result turns included) */
  messages: Array<{ role: string; content: unknown }>
  system: unknown
  tools: Array<{ name: string }>
}

export function scriptedClaude(script: (request: ScriptedRequest) => Block[]) {
  const requests: ScriptedRequest[] = []
  const fetchImpl = (async (_url: unknown, init?: { body?: string }) => {
    const body = JSON.parse(init?.body ?? '{}')
    const request: ScriptedRequest = { turn: requests.length, messages: body.messages, system: body.system, tools: body.tools }
    requests.push(request)
    const content = script(request)
    const usedTool = content.some(b => b.type === 'tool_use')
    return new Response(
      JSON.stringify({
        id: `msg_${request.turn}`, type: 'message', role: 'assistant', model: body.model, content,
        stop_reason: usedTool ? 'tool_use' : 'end_turn', stop_sequence: null,
        usage: { input_tokens: 100, output_tokens: 20, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    )
  }) as unknown as typeof fetch
  const client = new Anthropic({ apiKey: 'test-key', fetch: fetchImpl, maxRetries: 0 })
  return { client, requests }
}

/** The tool_result contents the SDK sent back in a request, parsed from JSON text, in order. */
export function toolResultsIn(request: ScriptedRequest): unknown[] {
  const last = request.messages[request.messages.length - 1]
  if (!Array.isArray(last?.content)) return []
  return (last.content as Array<{ type: string; content: unknown }>)
    .filter(b => b.type === 'tool_result')
    .map(b => {
      const raw = typeof b.content === 'string' ? b.content : ((b.content as Array<{ text: string }>)[0]?.text ?? '')
      try { return JSON.parse(raw) } catch { return raw }
    })
}
