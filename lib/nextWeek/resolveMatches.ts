/**
 * Ingredient name -> Ronen's item, worked out once per distinct name and saved (IngredientMatch).
 *
 * - Same words as an item: matched without the model (source "exact").
 * - Otherwise the cheap model picks an item, "none" (not bought) or "unsure" (source "model").
 * - Ronen's own picks (source "ronen") are never touched here.
 * - "none" and "unsure" answers are asked again when Ronen's items change (new receipts bring new items).
 */

import { createHash } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'
import { callForcedTool } from '@/lib/ai/claude'
import { AI_CONFIG } from '@/lib/ai/config'
import { exactItemMatch, ingredientKey } from './matchIngredient'
import { matchSchema, matchSystem, type MatchItem } from './matchPrompt'

export const MATCH_BATCH_SIZE = 40
export const MATCH_CONCURRENCY = 3

export type MatchStatus = 'matched' | 'none' | 'unsure'
export type MatchSource = 'exact' | 'model' | 'ronen'

export interface SavedMatch {
  status: MatchStatus
  itemName: string | null
  source: MatchSource
}

export interface ModelAnswer {
  name: string
  decision: 'item' | 'none' | 'unsure'
  item?: string
}

/** One call of the cheap model for a batch of ingredient names. Names are the original wording. */
export type MatchCall = (names: string[], items: MatchItem[]) => Promise<ModelAnswer[]>

export interface TokenUsage {
  input: number
  output: number
}

/** The real model call. Records token usage into `usage` when given. */
export function claudeMatcher(usage?: TokenUsage): MatchCall {
  return async (names, items) => {
    const result = await callForcedTool<{ answers: ModelAnswer[] }>({
      model: AI_CONFIG.matchIngredients.model,
      maxTokens: AI_CONFIG.matchIngredients.maxTokens,
      system: matchSystem(items),
      prompt: `Ingredient names:\n${names.map(n => `- ${n}`).join('\n')}`,
      toolName: 'record_matches',
      toolDescription: 'Record, for each ingredient name, the matching item, "none" or "unsure".',
      schema: matchSchema,
      onUsage: u => {
        if (usage) {
          usage.input += u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)
          usage.output += u.output_tokens
        }
      },
    })
    return result.answers ?? []
  }
}

/** A short fingerprint of the items, so "the items changed" is one comparison. */
export function itemsVersion(items: { item: string }[]): string {
  const names = items.map(i => i.item).sort()
  return createHash('sha1').update(names.join('\n')).digest('hex').slice(0, 12)
}

/** Distinct ingredient keys, each with the first wording seen (that wording is what the model reads). */
export function distinctNames(ingredients: string[]): Map<string, string> {
  const byKey = new Map<string, string>()
  for (const raw of ingredients) {
    const text = raw.trim()
    if (!text) continue
    const key = ingredientKey(text)
    if (!byKey.has(key)) byKey.set(key, text)
  }
  return byKey
}

/** Turns the model's answer for one name into what is saved. An item it invented counts as unsure. */
export function toSavedAnswer(answer: ModelAnswer | undefined, items: MatchItem[]): Pick<SavedMatch, 'status' | 'itemName'> {
  if (!answer) return { status: 'unsure', itemName: null }
  if (answer.decision === 'none') return { status: 'none', itemName: null }
  if (answer.decision === 'item') {
    const wanted = answer.item?.trim().toLowerCase()
    const found = items.find(i => i.item.toLowerCase() === wanted)
    if (found) return { status: 'matched', itemName: found.item }
  }
  return { status: 'unsure', itemName: null }
}

export interface ResolveOptions {
  /** Stop starting new model calls after this many ms (the saved ones stay saved) */
  budgetMs?: number
  /** Clock, replaceable in tests */
  now?: () => number
}

export interface ResolveResult {
  matches: Map<string, SavedMatch>
  /** Names answered by the model in this call */
  asked: number
  /** Names that still have no answer (model failed or budget ran out) */
  unresolved: number
}

/**
 * Make sure every ingredient has a saved, up-to-date answer, and return the answers by ingredient key.
 * Never throws for a model failure: those names simply stay unanswered (they show as "check").
 */
export async function resolveIngredientMatches(
  prisma: PrismaClient,
  ingredients: string[],
  items: MatchItem[],
  call: MatchCall,
  { budgetMs = 120_000, now = Date.now }: ResolveOptions = {}
): Promise<ResolveResult> {
  const names = distinctNames(ingredients)
  const matches = new Map<string, SavedMatch>()
  if (names.size === 0) return { matches, asked: 0, unresolved: 0 }

  const version = itemsVersion(items)
  const saved = await prisma.ingredientMatch.findMany({ where: { name: { in: [...names.keys()] } } })
  const savedByKey = new Map(saved.map(s => [s.name, s]))

  const askModel: [string, string][] = []
  for (const [key, text] of names) {
    const row = savedByKey.get(key)
    if (row) {
      matches.set(key, { status: row.status as MatchStatus, itemName: row.itemName, source: row.source as MatchSource })
      const stale = row.source === 'model' && row.status !== 'matched' && row.itemsVersion !== version
      if (!stale) continue
    }
    const exact = exactItemMatch(text, items)
    if (exact) {
      await saveAnswer(prisma, key, { status: 'matched', itemName: exact }, 'exact', null, !!row)
      matches.set(key, { status: 'matched', itemName: exact, source: 'exact' })
    } else {
      askModel.push([key, text])
    }
  }

  const batches: [string, string][][] = []
  for (let i = 0; i < askModel.length; i += MATCH_BATCH_SIZE) batches.push(askModel.slice(i, i + MATCH_BATCH_SIZE))

  const started = now()
  let asked = 0
  const answered = new Set<string>()
  const runBatch = async (batch: [string, string][]) => {
    if (now() - started > budgetMs) return
    let answers: ModelAnswer[]
    try {
      answers = await call(batch.map(([, text]) => text), items)
    } catch (err) {
      console.error('Ingredient matching: model call failed', err)
      return
    }
    const byName = new Map(answers.map(a => [a.name?.trim(), a]))
    for (const [key, text] of batch) {
      const answer = toSavedAnswer(byName.get(text), items)
      const row = savedByKey.get(key)
      const written = await saveAnswer(prisma, key, answer, 'model', version, !!row)
      // A row that is now Ronen's (he picked while we were asking) wins; reread it on the next load
      if (written) matches.set(key, { ...answer, source: 'model' })
      answered.add(key)
      asked++
    }
  }
  // A few batches at a time: a full run over ~350 names is 9 batches
  for (let i = 0; i < batches.length; i += MATCH_CONCURRENCY) {
    await Promise.all(batches.slice(i, i + MATCH_CONCURRENCY).map(runBatch))
  }

  return { matches, asked, unresolved: askModel.filter(([key]) => !answered.has(key)).length }
}

/** Insert or update one answer, but never over Ronen's own pick. Returns whether anything was written. */
async function saveAnswer(
  prisma: PrismaClient,
  name: string,
  answer: Pick<SavedMatch, 'status' | 'itemName'>,
  source: MatchSource,
  version: string | null,
  exists: boolean
): Promise<boolean> {
  const data = { itemName: answer.itemName, status: answer.status, source, itemsVersion: version }
  if (!exists) {
    const created = await prisma.ingredientMatch.createMany({ data: [{ name, ...data }], skipDuplicates: true })
    if (created.count > 0) return true
  }
  const updated = await prisma.ingredientMatch.updateMany({ where: { name, source: { not: 'ronen' } }, data })
  return updated.count > 0
}
