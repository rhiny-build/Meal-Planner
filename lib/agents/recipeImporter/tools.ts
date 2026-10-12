/**
 * The recipe importer's four tools.
 *
 *   fetch_page            read a web page (JSON-LD recipe first, else visible text)
 *   find_similar_recipes  look for duplicates already in the book
 *   cannot_import_recipe  the honest way out: no recipe to import (page unreachable, no recipe on it)
 *   submit_recipe         the final answer. It checks the recipe and returns the draft.
 *                         It does NOT save anything; that happens after Ronen reviews it.
 *
 * Each tool is { name, description, inputSchema, handler }. The handler is plain TypeScript;
 * the model only ever sees the name, description and schema (see ../loop.ts).
 */

import { prisma } from '@/lib/prisma'
import { parseAmount } from '@/lib/ingredientAmount'
import { validateStepText } from '@/lib/recipeStepTokens'
import type { AgentTool } from '../loop'
import { buildPageContent } from './pageText'
import { safeFetchHtml } from './safeFetch'
import type { DraftIngredient, RecipeDraft, SimilarRecipe } from './types'

// ---- fetch_page -------------------------------------------------------------------------

export async function fetchPage(input: { url?: string }) {
  if (!input?.url) throw new Error('url is required')
  const { finalUrl, html } = await safeFetchHtml(input.url)
  return buildPageContent(finalUrl, html)
}

// ---- find_similar_recipes ----------------------------------------------------------------

const STOP_WORDS = new Set(['the', 'and', 'with', 'for', 'recipe', 'easy', 'best', 'my', 'a', 'of'])

function nameWords(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

/** Existing recipes whose name shares at least half of its meaningful words with `name`. */
export async function findSimilarRecipes(input: { name?: string }): Promise<{ matches: SimilarRecipe[] }> {
  if (!input?.name?.trim()) throw new Error('name is required')
  const words = nameWords(input.name)
  if (words.length === 0) return { matches: [] }

  const candidates = await prisma.recipe.findMany({
    where: { OR: words.map((w) => ({ name: { contains: w, mode: 'insensitive' as const } })) },
    select: { id: true, name: true, kind: true, recipeUrl: true },
    take: 50,
  })

  const scored = candidates
    .map((recipe) => {
      const theirs = new Set(nameWords(recipe.name))
      const shared = words.filter((w) => theirs.has(w)).length
      return { recipe, score: shared / Math.max(words.length, theirs.size) }
    })
    .filter((s) => s.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  return { matches: scored.map((s) => s.recipe) }
}

// ---- submit_recipe -----------------------------------------------------------------------

const SUBMIT_RECIPE_SCHEMA = {
  type: 'object' as const,
  properties: {
    name: { type: 'string', description: 'Recipe name' },
    kind: {
      type: 'string',
      enum: ['full', 'quick'],
      description: 'quick only for a genuinely one-step item (e.g. oven fries, a burger); otherwise full',
    },
    description: { type: ['string', 'null'], description: 'One short sentence, or null' },
    servings: { type: ['integer', 'null'], description: 'How many people the quantities serve, if the source says' },
    totalTimeMinutes: { type: ['integer', 'null'], description: 'Start-to-table minutes, only if the source says' },
    prepTime: {
      type: ['string', 'null'],
      enum: ['quick', 'medium', 'long', null],
      description: 'Coarse bucket from total time: quick under 30 min, medium 30-60, long over 60. null if unknown',
    },
    notes: { type: ['string', 'null'], description: 'Tips or variations the source gives, or null' },
    ingredients: {
      type: 'array',
      description: 'In the source order',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Short unique id such as i1, i2. Steps refer to it as {ing:i1}' },
          name: { type: 'string', description: 'Ingredient name only, e.g. "plain flour"' },
          quantity: { type: ['string', 'null'], description: 'Quantity exactly as the source writes it: "1 1/2", "2-3", "a pinch"' },
          unit: { type: ['string', 'null'], description: 'Unit exactly as the source writes it: "cups", "g", "tbsp"' },
          notes: { type: ['string', 'null'], description: 'Preparation or extras: "finely chopped", "optional"' },
        },
        required: ['key', 'name', 'quantity', 'unit', 'notes'],
      },
    },
    steps: {
      type: 'array',
      description: 'The method. EMPTY ARRAY if the source has no clear method. Never invent steps.',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'One instruction. Mention an ingredient as {ing:<key>}' },
          timerSeconds: { type: ['integer', 'null'], description: 'If the step says to wait or cook for a set time' },
        },
        required: ['text', 'timerSeconds'],
      },
    },
    proteinType: { type: ['string', 'null'], description: 'Suggested protein type, from the allowed list, or null' },
    carbType: { type: ['string', 'null'], description: 'Suggested carb type, from the allowed list, or null' },
    includesVegetables: { type: 'boolean', description: 'True if vegetables are a main part of the dish' },
  },
  required: [
    'name', 'kind', 'description', 'servings', 'totalTimeMinutes', 'prepTime', 'notes',
    'ingredients', 'steps', 'proteinType', 'carbType', 'includesVegetables',
  ],
}

const KEY_PATTERN = /^[A-Za-z0-9_-]+$/

/** A positive whole number, or null. */
function positiveInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value) : null
}

function textOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * Check what the model submitted and turn it into a RecipeDraft.
 * Problems are thrown as errors: the loop shows the message to the model, which can correct it.
 */
export async function buildDraft(raw: any, sourceUrl: string | null): Promise<RecipeDraft> {
  const name = textOrNull(raw?.name)
  if (!name) throw new Error('name is required')
  if (raw.kind !== 'full' && raw.kind !== 'quick') throw new Error('kind must be "full" or "quick"')

  const rawIngredients: any[] = Array.isArray(raw.ingredients) ? raw.ingredients : []
  if (rawIngredients.length === 0) throw new Error('A recipe needs at least one ingredient. If there is no recipe to import, call cannot_import_recipe instead')

  const ingredients: DraftIngredient[] = rawIngredients.map((ing) => {
    const ingredientName = textOrNull(ing?.name)
    if (!ingredientName) throw new Error('Every ingredient needs a name')
    const quantity = textOrNull(ing.quantity)
    const unit = textOrNull(ing.unit)
    return {
      key: String(ing.key ?? ''),
      name: ingredientName,
      quantity,
      unit,
      // We work out the number ourselves from the text, so the model cannot convert units silently.
      amount: quantity ? parseAmount(quantity, unit).amount : null,
      notes: textOrNull(ing.notes),
    }
  })

  const keys = ingredients.map((i) => i.key)
  if (keys.some((k) => !KEY_PATTERN.test(k))) throw new Error('Every ingredient key must be letters, digits, - or _')
  if (new Set(keys).size !== keys.length) throw new Error('Ingredient keys must be unique')

  const rawSteps: any[] = Array.isArray(raw.steps) ? raw.steps : []
  const steps = rawSteps.map((step, index) => {
    const text = textOrNull(step?.text)
    if (!text) throw new Error(`Step ${index + 1} has no text`)
    const check = validateStepText(text, keys)
    if (!check.valid) {
      const problems = [...check.unknownIds.map((id) => `unknown ingredient key "${id}"`), ...check.malformed.map((m) => `malformed token "${m}"`)]
      throw new Error(`Step ${index + 1}: ${problems.join(', ')}. Use {ing:<key>} with a key from your ingredients list.`)
    }
    return { text, timerSeconds: positiveInt(step.timerSeconds) }
  })

  // Suggested types must exist in the book's DishType list, so filters keep working.
  const dishTypes = await prisma.dishType.findMany({ select: { value: true, category: true } })
  const allowed = (category: string) => dishTypes.filter((d) => d.category === category).map((d) => d.value)
  const proteinType = textOrNull(raw.proteinType)
  const carbType = textOrNull(raw.carbType)
  if (proteinType && !allowed('protein').includes(proteinType)) {
    throw new Error(`proteinType must be one of: ${allowed('protein').join(', ')} (or null)`)
  }
  if (carbType && !allowed('carb').includes(carbType)) {
    throw new Error(`carbType must be one of: ${allowed('carb').join(', ')} (or null)`)
  }

  return {
    name,
    kind: raw.kind,
    description: textOrNull(raw.description),
    servings: positiveInt(raw.servings),
    totalTimeMinutes: positiveInt(raw.totalTimeMinutes),
    prepTime: ['quick', 'medium', 'long'].includes(raw.prepTime) ? raw.prepTime : null,
    sourceUrl,
    notes: textOrNull(raw.notes),
    ingredients,
    steps,
    proteinType,
    carbType,
    includesVegetables: raw.includesVegetables === true,
  }
}

// ---- the tool list -----------------------------------------------------------------------

export function createImporterTools(options: { sourceUrl: string | null }) {
  /** Duplicates the model looked up, remembered so the review screen can warn about them. */
  const similar = new Map<string, SimilarRecipe>()

  const tools: AgentTool[] = [
    {
      name: 'fetch_page',
      description:
        'Fetch a web page. Returns the schema.org Recipe data from the page when it has it (source "json-ld"), ' +
        'otherwise the page\'s visible text (source "page-text"). Only public http/https URLs work.',
      inputSchema: {
        type: 'object',
        properties: { url: { type: 'string', description: 'The page URL' } },
        required: ['url'],
      },
      handler: fetchPage,
    },
    {
      name: 'find_similar_recipes',
      description: 'Search the recipe book for recipes with a similar name, to spot duplicates. Returns up to 5.',
      inputSchema: {
        type: 'object',
        properties: { name: { type: 'string', description: 'The recipe name to look for' } },
        required: ['name'],
      },
      handler: async (input) => {
        const result = await findSimilarRecipes(input)
        result.matches.forEach((m) => similar.set(m.id, m))
        return result
      },
    },
    {
      name: 'cannot_import_recipe',
      description:
        'Call this INSTEAD of submit_recipe when there is no recipe to import: the page could not be fetched, ' +
        'the page has no recipe on it, or the description is not a recipe. Never submit a placeholder or a guessed recipe.',
      inputSchema: {
        type: 'object',
        properties: { reason: { type: 'string', description: 'One plain sentence for the user explaining why' } },
        required: ['reason'],
      },
      handler: async (input) => ({ reason: textOrNull(input?.reason) ?? 'No recipe found' }),
      givesUp: true,
    },
    {
      name: 'submit_recipe',
      description:
        'Submit the finished recipe. Call this exactly once, as your last action. ' +
        'It is checked and returned to the user for review; nothing is saved yet. If it reports a problem, fix it and call again.',
      inputSchema: SUBMIT_RECIPE_SCHEMA,
      handler: async (input) => ({
        draft: await buildDraft(input, options.sourceUrl),
        similarRecipes: [...similar.values()],
      }),
      endsRun: true,
    },
  ]

  return tools
}
