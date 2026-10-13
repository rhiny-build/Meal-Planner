/**
 * The agent loop (hand-written on purpose, so it can be read top to bottom).
 *
 * An agent is a conversation with Claude in which Claude may ask us to run tools:
 *
 *   1. We send the task, the tool list and the conversation so far.
 *   2. Claude answers. Its answer is a list of blocks: some text, and maybe tool calls.
 *   3. No tool call? It stopped talking. We nudge it once, then give up.
 *   4. Tool calls? We run each tool, and send the results back as the next user message.
 *   5. Go to 1. The loop ends when:
 *        - a tool marked `endsRun` succeeds (its return value is the final answer), or
 *        - a tool marked `givesUp` is called (the agent reports it cannot do the task), or
 *        - Claude fails to finish properly, or
 *        - we hit `maxTurns` (the guard against a run that never ends).
 *
 * Every model turn, tool call and tool result is written to the run log (runLog.ts)
 * so the whole run can be replayed on /agent-runs.
 */

import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropic } from '@/lib/ai/claude'
import { startRun, type RunTrigger } from './runLog'

export interface AgentTool {
  name: string
  description: string
  /** JSON schema of the tool's input */
  inputSchema: Anthropic.Tool.InputSchema
  /** Does the work. Throw to report a problem; Claude sees the message and can retry. */
  handler: (input: any) => Promise<unknown>
  /** If true, a successful call ends the run and the handler's return value is the answer. */
  endsRun?: boolean
  /** If true, calling this tool fails the run on purpose. The handler returns { reason: string }. */
  givesUp?: boolean
}

export interface RunAgentParams {
  agent: string
  trigger: RunTrigger
  /** Recorded on the run, so you can see what the agent was asked to do */
  input: unknown
  model: string
  maxTokens: number
  system: string
  /** The task, as the first user message */
  userMessage: string
  tools: AgentTool[]
  /** Guard: the most model turns allowed before the run is failed */
  maxTurns: number
}

export interface AgentResult<T> {
  runId: string
  ok: boolean
  /** The final answer (set when ok) */
  output?: T
  /** Why the run failed (set when not ok) */
  error?: string
  /** Set when the agent itself chose to give up, with its own explanation (safe to show to the user) */
  gaveUpReason?: string
}

export async function runAgent<T>(params: RunAgentParams): Promise<AgentResult<T>> {
  const { tools, maxTurns } = params
  const run = await startRun({ agent: params.agent, trigger: params.trigger, input: params.input })

  const finalTool = tools.find((t) => t.endsRun)
  const toolDefinitions: Anthropic.Tool[] = tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema,
  }))
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: params.userMessage }]
  let nudged = false

  try {
    for (let turn = 1; turn <= maxTurns; turn++) {
      // 1. Ask Claude. This is the only place the model is called.
      //    tool_choice "auto": Claude decides whether to call a tool or to talk.
      const response = await getAnthropic().messages.create({
        model: params.model,
        max_tokens: params.maxTokens,
        system: params.system,
        tools: toolDefinitions,
        tool_choice: { type: 'auto' },
        messages,
      })
      await run.step(
        'model',
        { content: response.content, stopReason: response.stop_reason },
        {
          tokens: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
            cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
          },
        }
      )
      // Claude's answer becomes part of the conversation, exactly as returned.
      messages.push({ role: 'assistant', content: response.content })

      if (response.stop_reason === 'max_tokens') {
        // The reply was cut off, so a tool call in it may be incomplete. Do not run it.
        throw new Error('The model ran out of output tokens mid-answer')
      }

      const toolCalls = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
      )

      // 2. Claude answered in plain text without calling any tool.
      //    Nudge it once to finish properly, then fail the run cleanly.
      if (toolCalls.length === 0) {
        if (nudged || !finalTool) {
          throw new Error(`The model stopped without calling ${finalTool?.name ?? 'a tool'}`)
        }
        nudged = true
        const nudge = `Finish by calling the ${finalTool.name} tool with your final answer.`
        await run.step('note', { text: nudge, reason: 'model ended its turn without a tool call' })
        messages.push({ role: 'user', content: nudge })
        continue
      }

      // 3. Run every tool Claude asked for and collect the results.
      const results: Anthropic.ToolResultBlockParam[] = []
      let answer: unknown
      let finished = false
      let gaveUpReason: string | undefined

      for (const call of toolCalls) {
        await run.step('tool_call', { id: call.id, input: call.input }, { toolName: call.name })

        const tool = tools.find((t) => t.name === call.name)
        let output: unknown
        let isError = false
        try {
          if (!tool) throw new Error(`Unknown tool: ${call.name}`)
          output = await tool.handler(call.input)
          if (tool.endsRun) {
            finished = true
            answer = output
          }
          if (tool.givesUp) gaveUpReason = String((output as { reason?: unknown })?.reason ?? 'no reason given')
        } catch (error) {
          // A failing tool is not a failing run: tell Claude, it can fix its input or try another way.
          isError = true
          output = { error: error instanceof Error ? error.message : String(error) }
        }

        await run.step('tool_result', { output, isError }, { toolName: call.name })
        results.push({
          type: 'tool_result',
          tool_use_id: call.id,
          content: JSON.stringify(output),
          is_error: isError,
        })
      }

      // 4. Did the agent give up? Fail the run with its own explanation.
      if (gaveUpReason !== undefined) {
        await run.fail(`The agent gave up: ${gaveUpReason}`)
        return { runId: run.id, ok: false, error: `The agent gave up: ${gaveUpReason}`, gaveUpReason }
      }

      // 5. Done? The final tool succeeded, so its output is the answer.
      if (finished) {
        await run.finish(answer)
        return { runId: run.id, ok: true, output: answer as T }
      }

      // Otherwise the tool results go back to Claude as the next user message, and we loop.
      messages.push({ role: 'user', content: results })
    }

    throw new Error(`No final answer after ${maxTurns} turns`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    try {
      await run.fail(message)
    } catch (logError) {
      console.error('Could not record the failed run:', logError)
    }
    return { runId: run.id, ok: false, error: message }
  }
}
