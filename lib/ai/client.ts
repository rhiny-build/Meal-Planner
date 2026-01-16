/**
 * Shared OpenAI client configuration
 *
 * This module provides the OpenAI client instance used by all AI functions.
 * To switch to Claude or another provider, update this file only.
 */

import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
