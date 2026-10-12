/**
 * Step text <-> editor text
 *
 * Stored step text uses ingredient ids: "Sift {ing:abc123} into a bowl".
 * In the editor people see and type names instead: "Sift {flour} into a bowl".
 * These helpers convert between the two. Unknown {words} stay as plain text.
 */

import { parseStepText } from '@/lib/recipeStepTokens'

export interface EditorIngredient {
  id: string
  name: string
}

const usable = (name: string) => name.trim() !== '' && !/[{}]/.test(name)

/** Stored text -> editor text. Tokens of unknown ingredients become {ingredient}. */
export function stepToEditorText(text: string, ingredients: EditorIngredient[]): string {
  const byId = new Map(ingredients.map((i) => [i.id, i.name.trim()]))
  return parseStepText(text)
    .map((seg) => {
      if (seg.type === 'text') return seg.text
      const name = byId.get(seg.id)
      return name && usable(name) ? `{${name}}` : '{ingredient}'
    })
    .join('')
}

/** Editor text -> stored text. {name} matching an ingredient (case-insensitive) becomes its token. */
export function editorTextToStep(text: string, ingredients: EditorIngredient[]): string {
  const byName = new Map<string, string>()
  for (const i of ingredients) {
    const key = i.name.trim().toLowerCase()
    if (usable(i.name) && !byName.has(key)) byName.set(key, i.id)
  }
  return text.replace(/\{([^{}]+)\}/g, (whole, inner: string) => {
    const id = byName.get(inner.trim().toLowerCase())
    return id ? `{ing:${id}}` : whole
  })
}

/** Replace the tokens of a removed ingredient with its plain name so no step is left dangling. */
export function replaceTokenWithName(text: string, id: string, name: string): string {
  return parseStepText(text)
    .map((seg) =>
      seg.type === 'text'
        ? seg.text
        : seg.id === id
          ? name.trim() || 'the ingredient'
          : `{ing:${seg.id}}`
    )
    .join('')
}
