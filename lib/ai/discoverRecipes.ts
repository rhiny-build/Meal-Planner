/**
 * Recipe discovery via Claude + the web search server tool.
 *
 * Claude searches the web itself (server-side), then reports its findings by
 * calling the `submit_recipes` tool. We can't force that tool (forcing a tool
 * would stop it searching first), so tool_choice stays "auto" and the prompt
 * tells it to submit last.
 */

import type Anthropic from '@anthropic-ai/sdk'
import { getAnthropic } from './claude'
import { cachedSystem, withConversationCache } from './cache'
import { AI_CONFIG } from './config'
import { SYSTEM_PROMPTS } from './prompts'
import { DISCOVER_RECIPES_SCHEMA } from './schemas'

export interface DiscoveredRecipe {
  name: string
  recipeUrl: string
  ingredients: string
  proteinType: string | null
  carbType: string | null
  prepTime: string
  tier: string
}

const SUBMIT_TOOL = 'submit_recipes'
/** Server-side search loops can pause; allow a few continuations. */
const MAX_CONTINUATIONS = 3

export async function discoverRecipes(prompt: string): Promise<DiscoveredRecipe[]> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]

  for (let turn = 0; turn <= MAX_CONTINUATIONS; turn++) {
    const message = await getAnthropic().messages.create({
      model: AI_CONFIG.discoverRecipes.model,
      max_tokens: AI_CONFIG.discoverRecipes.maxTokens,
      system: cachedSystem(SYSTEM_PROMPTS.discoverRecipes),
      messages: withConversationCache(messages),
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: AI_CONFIG.discoverRecipes.webSearchMaxUses,
        },
        {
          name: SUBMIT_TOOL,
          description: 'Submit the final list of discovered recipes. Call this once, after searching.',
          input_schema: DISCOVER_RECIPES_SCHEMA,
        },
      ],
    })

    const submitted = message.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === SUBMIT_TOOL
    )
    if (submitted) {
      return (submitted.input as { recipes?: DiscoveredRecipe[] }).recipes ?? []
    }

    if (message.stop_reason === 'pause_turn') {
      // The server-side search hit its iteration limit; hand the turn back to continue.
      messages.push({ role: 'assistant', content: message.content })
      continue
    }

    // Claude answered in text without submitting: ask it to submit.
    messages.push({ role: 'assistant', content: message.content })
    messages.push({ role: 'user', content: `Now call ${SUBMIT_TOOL} with the recipes you found.` })
  }

  throw new Error('Claude did not return recipes')
}
