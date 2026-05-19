import OpenAI from 'openai'
import { PrismaClient } from '@prisma/client'

export interface MatchResult {
  id: string
  name: string
  type: string
  confidence: number
  reasoning: string
}

interface SlimMasterItem {
  id: string
  name: string
  type: string
  normalisedName: string | null
}

/** Normalise a string: lowercase, strip leading qty, strip punctuation. */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/^\d+(?:\.\d+)?(?:kg|g|ml|l)?\s*/, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Levenshtein distance between two strings. */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/** Score 0–1 based on normalised edit distance. */
function nameSimilarity(a: string, b: string): number {
  const na = normalise(a)
  const nb = normalise(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.85
  const dist = levenshtein(na, nb)
  const maxLen = Math.max(na.length, nb.length)
  return maxLen === 0 ? 1 : Math.max(0, 1 - dist / maxLen)
}

/** Find best name-similarity match among master items. Returns null if best < 0.5. */
function findByName(
  rawName: string,
  items: SlimMasterItem[]
): { item: SlimMasterItem; score: number } | null {
  let best: { item: SlimMasterItem; score: number } | null = null
  for (const item of items) {
    const nameScore = nameSimilarity(rawName, item.name)
    const normScore = item.normalisedName
      ? nameSimilarity(rawName, item.normalisedName)
      : 0
    const score = Math.max(nameScore, normScore)
    if (!best || score > best.score) best = { item, score }
  }
  return best && best.score >= 0.5 ? best : null
}

/** Call OpenAI to identify best match from master item list. */
async function askOpenAI(
  rawName: string,
  items: SlimMasterItem[],
  openai: OpenAI
): Promise<MatchResult | null> {
  const itemList = items
    .map((i) => `${i.id}: ${i.normalisedName ?? i.name}`)
    .join('\n')

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          'You are a grocery matching assistant. Given a raw receipt product name and a list of canonical grocery items, identify the best match. Respond ONLY with valid JSON.',
      },
      {
        role: 'user',
        content: `Raw receipt name: "${rawName}"

Available items (id: name):
${itemList}

Respond with JSON:
{
  "matchedId": "<id or null if no reasonable match>",
  "confidence": <0.0 to 1.0>,
  "reasoning": "<one sentence>"
}`,
      },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
  try {
    const json = JSON.parse(text.replace(/```json|```/g, '').trim()) as {
      matchedId: string | null
      confidence: number
      reasoning: string
    }
    if (!json.matchedId) return null
    const matched = items.find((i) => i.id === json.matchedId)
    if (!matched) return null
    return {
      id: matched.id,
      name: matched.normalisedName ?? matched.name,
      type: matched.type,
      confidence: Math.min(1, Math.max(0, json.confidence)),
      reasoning: `[OpenAI] ${json.reasoning}`,
    }
  } catch {
    return null
  }
}

export async function findMatch(
  rawName: string,
  masterItems: SlimMasterItem[],
  prisma: PrismaClient,
  openai: OpenAI
): Promise<MatchResult | null> {
  // 1. Check NormalisationCache
  const cached = await prisma.recipeIngredientNormalisationCache.findFirst({
    where: { input: rawName.toLowerCase() },
  })
  const lookupName = cached?.canonical ?? rawName

  // 2. Check IngredientMapping for supporting evidence
  const mapping = await prisma.ingredientMapping.findFirst({
    where: { recipeName: { contains: normalise(lookupName), mode: 'insensitive' } },
    orderBy: { confirmedCount: 'desc' },
  })
  const mappingBonus = mapping ? 0.1 : 0

  // 3. Name similarity search
  const nameMatch = findByName(lookupName, masterItems)

  if (nameMatch && nameMatch.score >= 0.7) {
    const confidence = Math.min(1, nameMatch.score + mappingBonus)
    return {
      id: nameMatch.item.id,
      name: nameMatch.item.normalisedName ?? nameMatch.item.name,
      type: nameMatch.item.type,
      confidence,
      reasoning: `Name similarity ${Math.round(nameMatch.score * 100)}%${cached ? ' (via normalisation cache)' : ''}${mapping ? ', supported by ingredient mapping' : ''}`,
    }
  }

  // 4. Fall back to OpenAI — look up type from matched item
  const aiMatch = await askOpenAI(lookupName, masterItems, openai)
  if (aiMatch) {
    const matchedItem = masterItems.find((i) => i.id === aiMatch.id)
    return {
      ...aiMatch,
      type: matchedItem?.type ?? 'restock',
      confidence: Math.min(1, aiMatch.confidence + mappingBonus),
    }
  }

  // 5. Weak name match (0.5–0.7) — surface as low-confidence pending
  if (nameMatch) {
    return {
      id: nameMatch.item.id,
      name: nameMatch.item.normalisedName ?? nameMatch.item.name,
      type: nameMatch.item.type,
      confidence: Math.min(0.65, nameMatch.score + mappingBonus),
      reasoning: `Weak name similarity ${Math.round(nameMatch.score * 100)}% — needs review`,
    }
  }

  return null
}
