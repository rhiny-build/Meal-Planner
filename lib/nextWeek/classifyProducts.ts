/**
 * Product name -> item, aisle, cupboard flag. The cheap model is used once per new product name and the
 * answer is cached in ProductMapping. Corrected rows (Ronen's edits) are never overwritten.
 */

import type { PrismaClient } from '@prisma/client'
import { callForcedTool } from '@/lib/ai/claude'
import { AI_CONFIG } from '@/lib/ai/config'
import { AISLES, isAisle } from './aisles'
import { CLASSIFY_SYSTEM, classifySchema } from './classifyPrompt'
import { fallbackItemName } from './itemName'

export const CLASSIFY_BATCH_SIZE = 30

interface ClassifiedProduct {
  name: string
  item: string
  aisle: string
  cupboard: boolean
}

export type ClassifyCall = (names: string[]) => Promise<ClassifiedProduct[]>

export interface TokenUsage {
  input: number
  output: number
}

/** The real model call. Records token usage into `usage` when given. */
export function claudeClassifier(usage?: TokenUsage): ClassifyCall {
  return async names => {
    const result = await callForcedTool<{ products: ClassifiedProduct[] }>({
      model: AI_CONFIG.classifyProducts.model,
      maxTokens: AI_CONFIG.classifyProducts.maxTokens,
      system: CLASSIFY_SYSTEM,
      prompt: `Product names:\n${names.map(n => `- ${n}`).join('\n')}`,
      toolName: 'record_products',
      toolDescription: 'Record the item, aisle and cupboard flag for each product name.',
      schema: classifySchema,
      onUsage: u => {
        if (usage) {
          usage.input += u.input_tokens + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0)
          usage.output += u.output_tokens
        }
      },
    })
    return result.products ?? []
  }
}

/** Distinct product names from uploaded receipts that have no ProductMapping yet. */
export async function unmappedProductNames(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ rawName: string }[]>`
    SELECT DISTINCT ph."rawName" FROM "PurchaseHistory" ph
    LEFT JOIN "ProductMapping" pm ON pm."productName" = ph."rawName"
    WHERE ph."orderNumber" IS NOT NULL AND pm.id IS NULL
    ORDER BY ph."rawName"`
  return rows.map(r => r.rawName)
}

export interface ClassifyResult {
  classified: number
  remaining: number
}

/** Classify up to `limit` unmapped names. Safe to call repeatedly; returns how many are still waiting. */
export async function classifyNewProducts(
  prisma: PrismaClient,
  classify: ClassifyCall,
  limit = CLASSIFY_BATCH_SIZE
): Promise<ClassifyResult> {
  const pending = await unmappedProductNames(prisma)
  const batch = pending.slice(0, limit)
  if (batch.length === 0) return { classified: 0, remaining: 0 }

  const answers = new Map((await classify(batch)).map(a => [a.name, a]))
  const data = batch.map(name => {
    const a = answers.get(name)
    return {
      productName: name,
      itemName: a?.item?.trim().toLowerCase() || fallbackItemName(name),
      aisle: a && isAisle(a.aisle) ? a.aisle : 'Other',
      cupboard: a?.cupboard ?? false,
    }
  })
  await prisma.productMapping.createMany({ data, skipDuplicates: true })
  return { classified: batch.length, remaining: pending.length - batch.length }
}

export { AISLES }
