/**
 * Recipe step ingredient tokens
 *
 * Step text can reference an ingredient of the same recipe by id:
 *
 *   "Fry {ing:clx1abc} until golden, then add {ing:clx2def}."
 *
 * Token format: `{ing:<ingredientId>}` where the id is [A-Za-z0-9_-]+ (cuid).
 * Steps reference ids (not names) so renaming an ingredient or changing its
 * amount never breaks the method, and cook mode can show the scaled amount.
 *
 * Unknown or deleted ids never throw: they render as plain text.
 */

export interface StepIngredient {
  id: string
  name: string
  quantity?: string | null
  unit?: string | null
  amount?: number | null
}

export type StepSegment =
  | { type: 'text'; text: string }
  | { type: 'ingredient'; id: string }

export interface StepValidation {
  valid: boolean
  /** Token ids that are not in the recipe's ingredient list */
  unknownIds: string[]
  /** Fragments that start like a token but are not well-formed, e.g. "{ing:" or "{ing:}" */
  malformed: string[]
}

/** Shown when a token's ingredient no longer exists. */
export const UNKNOWN_INGREDIENT_TEXT = 'the ingredient'

const TOKEN_SOURCE = String.raw`\{ing:([A-Za-z0-9_-]+)\}`

export function makeIngredientToken(id: string): string {
  return `{ing:${id}}`
}

/** Split step text into plain-text and ingredient segments. */
export function parseStepText(text: string): StepSegment[] {
  const segments: StepSegment[] = []
  if (!text) return segments
  const re = new RegExp(TOKEN_SOURCE, 'g')
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ type: 'text', text: text.slice(last, m.index) })
    segments.push({ type: 'ingredient', id: m[1] })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ type: 'text', text: text.slice(last) })
  return segments
}

/** Ids referenced by a step, in order, without duplicates. */
export function getStepIngredientIds(text: string): string[] {
  const ids: string[] = []
  for (const s of parseStepText(text)) {
    if (s.type === 'ingredient' && !ids.includes(s.id)) ids.push(s.id)
  }
  return ids
}

/** Format a scaled number: whole numbers stay whole, otherwise up to 2 decimals, no trailing zeros. */
export function formatAmount(n: number): string {
  if (!isFinite(n)) return ''
  const rounded = Math.round(n * 100) / 100
  return String(rounded)
}

/** "300 g flour", "1 1/2 pounds beef" (unscaled free text when there is no numeric amount). */
export function describeIngredient(ing: StepIngredient, scale = 1): string {
  const unit = ing.unit?.trim() || ''
  let amountText = ''
  if (typeof ing.amount === 'number' && isFinite(ing.amount)) {
    amountText = formatAmount(ing.amount * scale)
  } else if (ing.quantity?.trim()) {
    amountText = ing.quantity.trim() // cannot scale free text
  }
  return [amountText, unit, ing.name].filter(Boolean).join(' ')
}

/**
 * Render step text as plain text, replacing each token with the (scaled)
 * ingredient description. Tokens whose id is not in `ingredients` render as
 * UNKNOWN_INGREDIENT_TEXT. Never throws.
 */
export function renderStepText(
  text: string,
  ingredients: StepIngredient[],
  scale = 1
): string {
  if (!text) return ''
  const byId = new Map(ingredients.map((i) => [i.id, i]))
  const safeScale = typeof scale === 'number' && isFinite(scale) && scale > 0 ? scale : 1
  return parseStepText(text)
    .map((seg) => {
      if (seg.type === 'text') return seg.text
      const ing = byId.get(seg.id)
      return ing ? describeIngredient(ing, safeScale) : UNKNOWN_INGREDIENT_TEXT
    })
    .join('')
}

/** Check step text against the recipe's ingredient ids. Use before saving a step. */
export function validateStepText(text: string, validIds: Iterable<string>): StepValidation {
  const valid = new Set(validIds)
  const unknownIds = getStepIngredientIds(text).filter((id) => !valid.has(id))
  const stripped = (text ?? '').replace(new RegExp(TOKEN_SOURCE, 'g'), '')
  const malformed = stripped.match(/\{ing:[^}]*\}?/g) ?? []
  return { valid: unknownIds.length === 0 && malformed.length === 0, unknownIds, malformed }
}
