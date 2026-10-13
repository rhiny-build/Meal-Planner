/**
 * OpenAI client — EMBEDDINGS ONLY.
 *
 * All generative AI (chat, extraction, planning, discovery) runs on Claude
 * via lib/ai/claude.ts. This client exists solely for text embeddings
 * (see lib/shopping-list/ingredientEmbeddings.ts). Do not add chat calls here.
 */

import OpenAI from 'openai'

let client: OpenAI | null = null

/**
 * Created on first use, so importing this module never needs a key
 * (the Next build imports every route and fails on a missing key otherwise).
 */
export function getOpenAIEmbeddingsClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return client
}
