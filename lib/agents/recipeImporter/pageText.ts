/**
 * Turn a recipe web page into something small and readable for the model.
 *
 * Most recipe sites embed the recipe as schema.org JSON-LD in a <script> tag. It is by far
 * the most reliable source (clean ingredient lines, steps, yield, times), so we look for
 * it first and only fall back to the page's visible text when it is missing.
 */

import { EXTRACT_HTML_MAX_LENGTH } from '@/lib/ai/config'

type Json = Record<string, unknown>

/** The schema.org Recipe fields worth showing to the model. Images, ratings, authors are dropped. */
const RECIPE_FIELDS = [
  'name',
  'description',
  'recipeYield',
  'prepTime',
  'cookTime',
  'totalTime',
  'recipeCategory',
  'recipeCuisine',
  'recipeIngredient',
  'recipeInstructions',
]

function isRecipeNode(node: unknown): node is Json {
  if (!node || typeof node !== 'object') return false
  const type = (node as Json)['@type']
  return Array.isArray(type) ? type.includes('Recipe') : type === 'Recipe'
}

/** Walk parsed JSON-LD (objects, arrays, @graph) and return the first Recipe node. */
function findRecipe(node: unknown): Json | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipe(item)
      if (found) return found
    }
    return null
  }
  if (!node || typeof node !== 'object') return null
  if (isRecipeNode(node)) return node
  return findRecipe((node as Json)['@graph'])
}

/** Find a schema.org Recipe in the page's JSON-LD scripts, or null. */
export function extractJsonLdRecipe(html: string): Json | null {
  const scripts = html.matchAll(
    /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )
  for (const match of scripts) {
    try {
      const recipe = findRecipe(JSON.parse(match[1].trim()))
      if (recipe) {
        return Object.fromEntries(
          RECIPE_FIELDS.filter((key) => recipe[key] !== undefined).map((key) => [key, recipe[key]])
        )
      }
    } catch {
      // Malformed JSON-LD is common; try the next script.
    }
  }
  return null
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  frac12: '½',
  frac14: '¼',
  frac34: '¾',
  deg: '°',
  ndash: '–',
  mdash: '—',
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z0-9]+);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole
    }
    return ENTITIES[body.toLowerCase()] ?? whole
  })
}

/** Visible text of an HTML page: scripts, styles and page chrome removed, blocks on their own lines. */
export function htmlToText(html: string): string {
  const text = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|head|nav|footer|form|iframe)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/?(p|div|br|li|ul|ol|h[1-6]|tr|section|article|header|table|dt|dd)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
  return decodeEntities(text)
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

export function pageTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return match ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() || null : null
}

export interface PageContent {
  url: string
  title: string | null
  /** 'json-ld' when a schema.org Recipe was found, otherwise 'page-text' */
  source: 'json-ld' | 'page-text'
  /** The schema.org Recipe (when source is json-ld) */
  recipe?: Json
  /** Visible page text, cut to EXTRACT_HTML_MAX_LENGTH (when source is page-text) */
  text?: string
  truncated?: boolean
}

/** JSON-LD first; page text only when there is no JSON-LD recipe. */
export function buildPageContent(url: string, html: string): PageContent {
  const title = pageTitle(html)
  const recipe = extractJsonLdRecipe(html)
  if (recipe) return { url, title, source: 'json-ld', recipe }

  const text = htmlToText(html)
  return {
    url,
    title,
    source: 'page-text',
    text: text.slice(0, EXTRACT_HTML_MAX_LENGTH),
    truncated: text.length > EXTRACT_HTML_MAX_LENGTH,
  }
}
