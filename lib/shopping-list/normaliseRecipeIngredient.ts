/**
 * Recipe ingredient normalisation — pipeline entry point.
 *
 * Normalises a raw recipe ingredient string (e.g. "2 garlic cloves") into
 * canonical form (e.g. "garlic (fresh)") for embedding comparison.
 *
 * Pipeline:
 * 1. Deterministic rules (normaliseName) — handles form extraction, singularisation
 * 2. DB cache lookup — avoids repeat LLM calls
 * 3. LLM fallback (only if USE_LLM=true) — semantic normalisation, cached for next time
 *
 * The result is transient — used only for embedding comparison during the
 * shopping list pipeline. Never persisted on ShoppingListItem or MasterListItem.
 *
 * For master item normalisation (on create/update), see lib/shopping-list/normaliseMasterItem.ts.
 */

import pluralize from 'pluralize'
import { stripUnitsFromName } from './aggregateRecipeIngredients'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NormalisedResult {
  canonical: string // "garlic (fresh)", "tomato (tinned)", "chicken breast"
  base: string      // "garlic", "tomato", "chicken breast"
  form: string | null // "fresh", "tinned", null
  confident: boolean // true when rules fired or input is a known staple
}

// ─── Deterministic normalisation rules ──────────────────────────────────────

// Simple ingredients that are always confidently identified as-is.
const ALWAYS_CONFIDENT = new Set([
  'salt', 'pepper', 'butter', 'sugar', 'flour', 'egg', 'water', 'milk', 'cream',
])

// Maps keywords found in ingredient names to a canonical form label.
// Order matters: first match wins when scanning tokens left-to-right.
const FORM_KEYWORDS: Record<string, string> = {
  // Fresh indicators
  cloves: 'fresh',
  clove: 'fresh',
  bulb: 'fresh',
  fresh: 'fresh',
  // Dried/ground forms
  granules: 'dried',
  granule: 'dried',
  powder: 'dried',
  powdered: 'dried',
  dried: 'dried',
  dry: 'dried',
  ground: 'ground',
  // Preserved forms
  tinned: 'tinned',
  canned: 'tinned',
  // Paste
  paste: 'paste',
  // Flaked
  flaked: 'flaked',
  flakes: 'flaked',
  flake: 'flaked',
  // Other forms
  frozen: 'frozen',
  smoked: 'smoked',
  pickled: 'pickled',
}

// Words that should NOT be treated as form keywords when they're part of a
// compound ingredient name (e.g. "ground beef" — "ground" is the base, not a form).
// These are checked as "base + form-keyword" compounds.
const COMPOUND_EXCEPTIONS: Set<string> = new Set([
  'ground beef',
  'ground lamb',
  'ground pork',
  'ground turkey',
  'ground chicken',
  'ground meat',
  'smoked salmon',
  'smoked paprika',
  'smoked mackerel',
  'dried fruit',
  'dried cranberries',
  'dried apricots',
])

/**
 * Normalise a single ingredient name to canonical form.
 *
 * Expects raw input including quantities and units (e.g. "2 garlic cloves",
 * "500g chicken breast"). Handles its own unit stripping — callers should
 * NOT pre-strip.
 */
export function normaliseName(raw: string): NormalisedResult {
  if (!raw || !raw.trim()) {
    return { canonical: '', base: '', form: null, confident: false }
  }

  // 1. Lowercase
  let cleaned = raw.toLowerCase().trim()

  // 2. Strip quantities and units
  cleaned = stripUnitsFromName(cleaned).toLowerCase().trim()

  // 3. Check if the full cleaned name (before singularisation) is a compound exception
  const singularCleaned = singularise(cleaned)
  if (COMPOUND_EXCEPTIONS.has(cleaned) || COMPOUND_EXCEPTIONS.has(singularCleaned)) {
    return { canonical: singularCleaned, base: singularCleaned, form: null, confident: true }
  }

  // 4. Extract form by scanning tokens
  const tokens = cleaned.split(/\s+/)
  let detectedForm: string | null = null
  let formTokenIndex = -1

  for (let i = 0; i < tokens.length; i++) {
    const formLabel = FORM_KEYWORDS[tokens[i]]
    if (formLabel) {
      detectedForm = formLabel
      formTokenIndex = i
      break
    }
  }

  // 5. Build base by removing the form token
  let baseTokens: string[]
  if (formTokenIndex >= 0) {
    baseTokens = tokens.filter((_, i) => i !== formTokenIndex)
  } else {
    baseTokens = [...tokens]
  }

  // 6. Singularise the base
  let base = baseTokens.join(' ').trim()
  base = singularise(base)

  if (!base) {
    // Edge case: the entire name was a form keyword (e.g. just "fresh")
    base = cleaned
    detectedForm = null
  }

  // 7. Construct canonical name
  const canonical = detectedForm ? `${base} (${detectedForm})` : base

  // 8. Determine confidence — only true when a meaningful rule fired,
  //    not just lowercasing or singularising.
  const formExtracted = detectedForm !== null
  const isKnownStaple = ALWAYS_CONFIDENT.has(singularise(cleaned))
  const confident = formExtracted || isKnownStaple

  return { canonical, base, form: detectedForm, confident }
}

/**
 * Singularise a word or phrase.
 * Applies pluralize.singular to the last word (the noun) in multi-word names.
 */
function singularise(text: string): string {
  const words = text.split(/\s+/)
  if (words.length === 0) return text

  // Only singularise the last word (the noun)
  const lastWord = words[words.length - 1]
  const singular = pluralize.singular(lastWord)
  words[words.length - 1] = singular

  return words.join(' ')
}

// ─── Pipeline entry points ──────────────────────────────────────────────────

/**
 * Non-cached normalisation — deterministic rules + optional LLM fallback.
 * Used by the eval script only. The pipeline uses normaliseRecipeIngredient.
 */
export async function normaliseIngredient(
  raw: string
): Promise<NormalisedResult> {
  // 1. Deterministic normalisation
  const result = normaliseName(raw)
  if (result.confident) {
    return result
  }

  // 2. LLM fallback (only if enabled)
  if (!process.env.USE_LLM) {
    return result
  }

  // Lazy-import to avoid loading OpenAI when LLM is disabled
  const { llmNormalise } = await import('./normaliseRecipeIngredientLLM')
  return llmNormalise(raw)
}

/**
 * Normalise a raw recipe ingredient string to canonical form with DB caching.
 * This is the primary entry point used by the shopping list pipeline (Step 2).
 */
export async function normaliseRecipeIngredient(
  raw: string
): Promise<NormalisedResult> {
  // 1. Deterministic — no cache needed, it's instant
  const result = normaliseName(raw)
  if (result.confident) {
    return result
  }

  // 2. Check cache before hitting LLM
  const { prisma } = await import('../prisma')
  const cacheKey = raw.toLowerCase().trim()
  const cached = await prisma.recipeIngredientNormalisationCache.findUnique({
    where: { input: cacheKey },
  })

  if (cached) {
    return {
      canonical: cached.canonical,
      base: cached.base,
      form: cached.form,
      confident: true,
    }
  }

  // 3. LLM fallback (only if enabled)
  if (!process.env.USE_LLM) {
    return result
  }

  const { llmNormalise } = await import('./normaliseRecipeIngredientLLM')
  const llmResult = await llmNormalise(raw)

  // 4. Cache the result
  await prisma.recipeIngredientNormalisationCache.upsert({
    where: { input: cacheKey },
    create: {
      input: cacheKey,
      canonical: llmResult.canonical,
      base: llmResult.base,
      form: llmResult.form,
    },
    update: {
      canonical: llmResult.canonical,
      base: llmResult.base,
      form: llmResult.form,
    },
  })

  return llmResult
}
