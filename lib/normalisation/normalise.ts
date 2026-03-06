/**
 * Normalise recipe ingredient names to canonical form.
 *
 * Pure utility — no DB, no AI. Converts raw ingredient names like
 * "tinned tomatoes" into canonical form "tomato (tinned)" by:
 * 1. Lowercasing
 * 2. Stripping quantities/units
 * 3. Singularising
 * 4. Extracting form (fresh, dried, tinned, etc.)
 */

import pluralize from 'pluralize'
import { stripUnitsFromName } from './shoppingListHelpers'

export interface NormalisedResult {
  canonical: string // "garlic (fresh)", "tomato (tinned)", "chicken breast"
  base: string      // "garlic", "tomato", "chicken breast"
  form: string | null // "fresh", "tinned", null
}

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
 */
export function normaliseName(raw: string): NormalisedResult {
  if (!raw || !raw.trim()) {
    return { canonical: '', base: '', form: null }
  }

  // 1. Lowercase
  let cleaned = raw.toLowerCase().trim()

  // 2. Strip quantities and units
  cleaned = stripUnitsFromName(cleaned).toLowerCase().trim()

  // 3. Check if the full cleaned name (before singularisation) is a compound exception
  const singularCleaned = singularise(cleaned)
  if (COMPOUND_EXCEPTIONS.has(cleaned) || COMPOUND_EXCEPTIONS.has(singularCleaned)) {
    return { canonical: singularCleaned, base: singularCleaned, form: null }
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

  return { canonical, base, form: detectedForm }
}

/**
 * Batch normalise multiple ingredient names.
 */
export function normaliseNames(names: string[]): NormalisedResult[] {
  return names.map(normaliseName)
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
