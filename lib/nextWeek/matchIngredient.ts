/**
 * Word-level helpers for matching a recipe ingredient name ("skinless chicken breast fillets, diced") to one of
 * Ronen's items ("chicken breast").
 *
 * - `exactItemMatch` is the only matching done without the model: the same words as an item, after dropping
 *   filler and plurals. Free, and never wrong in a way that matters.
 * - `matchIngredient` is the OLD word-subset matcher. The Next week list no longer uses it (it matched "Sweet Corn"
 *   to Haribo sweets); it stays as the "before" side of the quality score (scripts/rehaul/scoreIngredientMatching.ts).
 * - `ingredientKey` is the saved-answer key: one answer per distinct name.
 */

import pluralize from 'pluralize'

const FILLER = new Set([
  'fresh', 'large', 'small', 'medium', 'big', 'chopped', 'diced', 'sliced', 'minced', 'grated', 'crushed', 'peeled',
  'finely', 'roughly', 'thinly', 'ripe', 'optional', 'taste', 'to', 'of', 'a', 'the', 'and', 'or', 'for', 'garnish',
  'handful', 'pinch', 'dash', 'splash', 'tsp', 'tbsp', 'cup', 'cups', 'clove', 'cloves', 'g', 'kg', 'ml', 'l', 'x',
  'whole', 'boneless', 'skinless', 'frozen', 'cooked', 'dried', 'tinned', 'canned', 'extra',
])

export function normaliseWords(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/,.*$/, ' ')
    .replace(/[^a-zà-ÿ ]/g, ' ')
    .split(/\s+/)
    .filter(w => w && !FILLER.has(w))
    .map(w => pluralize.singular(w))
}

const isSubset = (small: string[], big: string[]) => small.length > 0 && small.every(w => big.includes(w))

/**
 * The key a saved answer is stored under: lower case, brackets and anything after a comma dropped, only letters kept.
 * Deliberately keeps filler words ("tinned tomatoes" and "tomatoes" are different things to buy).
 */
export function ingredientKey(name: string): string {
  const key = name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/,.*$/, ' ')
    .replace(/[^a-zà-ÿ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return key || name.toLowerCase().trim()
}

/** Lower-case words with plurals made singular, but nothing dropped ("chopped tomatoes" stays two words). */
const strictWords = (name: string) =>
  name
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/,.*$/, ' ')
    .replace(/[^a-zà-ÿ ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => pluralize.singular(w))
    .join(' ')

/**
 * The item that is the same thing as the ingredient, without the model:
 *  1. the same words (plurals ignored): "Tomatoes" is "tomato", "chopped tomatoes" is "chopped tomatoes";
 *  2. the same words once filler is dropped ("Grated Mozzarella" is "mozzarella"), but only when exactly one item
 *     fits, so "tomatoes" is never guessed between "tomato" and "chopped tomatoes".
 * Anything else is left to the model.
 */
export function exactItemMatch(ingredient: string, items: { item: string; bought: number }[]): string | null {
  const strict = strictWords(ingredient)
  if (!strict) return null
  const same = items.filter(i => strictWords(i.item) === strict)
  if (same.length > 0) return same.reduce((a, b) => (b.bought > a.bought ? b : a)).item

  const words = normaliseWords(ingredient).join(' ')
  if (!words) return null
  const loose = items.filter(i => normaliseWords(i.item).join(' ') === words)
  return loose.length === 1 ? loose[0].item : null
}

/** Key used for ingredients that match no known item (old matcher). */
export const rawKey = (ingredient: string) => `raw:${normaliseWords(ingredient).join(' ') || ingredient.toLowerCase().trim()}`

export function matchIngredient(ingredient: string, items: { item: string; bought: number }[]): string | null {
  const words = normaliseWords(ingredient)
  if (words.length === 0) return null
  let best: { item: string; score: number; bought: number } | null = null
  for (const candidate of items) {
    const itemWords = normaliseWords(candidate.item)
    let score = 0
    if (itemWords.join(' ') === words.join(' ')) score = 1000
    else if (isSubset(itemWords, words)) score = 100 + itemWords.length
    else if (isSubset(words, itemWords)) score = 10 - (itemWords.length - words.length)
    if (score === 0) continue
    if (!best || score > best.score || (score === best.score && candidate.bought > best.bought)) {
      best = { item: candidate.item, score, bought: candidate.bought }
    }
  }
  return best?.item ?? null
}
