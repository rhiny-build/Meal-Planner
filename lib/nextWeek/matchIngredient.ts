/**
 * Match a recipe ingredient name ("skinless chicken breast fillets, diced") to one of Ronen's known items
 * ("chicken breast"). Deterministic and free: exact match first, then an item whose words all appear in the
 * ingredient, then an ingredient whose words all appear in the item. Ties go to the item bought most often.
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

/** Key used for ingredients that match no known item. */
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
