/**
 * Recipe importer agent.
 *
 * Input: a URL or a free-text description. Output: a recipe DRAFT for review (not saved).
 * This file only wires things together: prompt + tools + the generic loop in ../loop.ts.
 */

import { AI_CONFIG } from '@/lib/ai/config'
import { prisma } from '@/lib/prisma'
import { runAgent } from '../loop'
import type { RunTrigger } from '../runLog'
import { buildEnrichSystemAddition, buildEnrichUserMessage, type EnrichContext } from './enrichPrompt'
import { buildSystemPrompt, buildUserMessage } from './prompt'
import { createImporterTools } from './tools'
import type { ImportResult } from './types'

export const RECIPE_IMPORTER_AGENT = 'recipe-importer'

export type ImporterInput = { url: string } | { text: string }

/** One text box feeds both modes: a lone http(s) URL is a URL, anything else is a description. */
export function classifyImportInput(raw: string): ImporterInput {
  const trimmed = raw.trim()
  return /^https?:\/\/\S+$/i.test(trimmed) ? { url: trimmed } : { text: trimmed }
}

export interface ImporterOptions {
  /**
   * Enrich mode (S07 backfill): the recipe already exists. The input must be a URL; the model gets
   * the book's copy and is told to reuse its ingredient ids. The run still only produces a draft.
   */
  enrich?: EnrichContext
  /** Override the configured model (used by the Haiku-vs-Sonnet comparison script). */
  model?: string
}

export async function runRecipeImporter(
  input: ImporterInput,
  trigger: RunTrigger = 'manual',
  options: ImporterOptions = {}
) {
  const enrich = options.enrich
  if (enrich && !('url' in input)) throw new Error('Enrich mode needs a URL')
  const dishTypes = await prisma.dishType.findMany({ orderBy: { order: 'asc' } })
  const config = AI_CONFIG.recipeImporter

  return runAgent<ImportResult>({
    agent: RECIPE_IMPORTER_AGENT,
    trigger,
    input: enrich ? { ...input, mode: 'enrich', recipeId: enrich.recipeId } : input,
    model: options.model ?? config.model,
    maxTokens: config.maxTokens,
    maxTurns: config.maxTurns,
    system:
      buildSystemPrompt({
        proteins: dishTypes.filter((d) => d.category === 'protein').map((d) => d.value),
        carbs: dishTypes.filter((d) => d.category === 'carb').map((d) => d.value),
      }) + (enrich ? buildEnrichSystemAddition() : ''),
    userMessage: enrich && 'url' in input ? buildEnrichUserMessage(input.url, enrich) : buildUserMessage(input),
    tools: createImporterTools({ sourceUrl: 'url' in input ? input.url : null, enrich: !!enrich }),
  })
}
