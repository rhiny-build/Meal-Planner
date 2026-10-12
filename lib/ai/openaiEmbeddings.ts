/**
 * OpenAI client — EMBEDDINGS ONLY.
 *
 * All generative AI (chat, extraction, planning, discovery) runs on Claude
 * via lib/ai/claude.ts. This client exists solely for text embeddings
 * (see lib/shopping-list/ingredientEmbeddings.ts). Do not add chat calls here.
 */

import OpenAI from 'openai'

export const openaiEmbeddingsClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
