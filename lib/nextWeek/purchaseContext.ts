/**
 * What Ronen buys, from his uploaded receipts: the history (items by order date) and the item catalog.
 * Shared by the Next week list and by ingredient matching, so both see the same items.
 */

import type { PrismaClient } from '@prisma/client'
import type { ItemInfo } from './buildList'
import { fallbackItemName } from './itemName'
import type { MatchItem } from './matchPrompt'
import { buildHistory, type History, type PurchaseLine } from './predict'

export interface PurchaseContext {
  history: History
  catalog: Map<string, ItemInfo>
  /** Every item with its aisle and in how many orders it was bought, for matching and for the "which product" list */
  items: MatchItem[]
  /** Receipt products that have no item yet */
  unclassified: number
}

export function buildPurchaseContext(
  rows: { rawName: string; purchaseDate: Date }[],
  mappings: { productName: string; itemName: string; aisle: string; cupboard: boolean }[]
): PurchaseContext {
  const mappingByProduct = new Map(mappings.map(m => [m.productName, m]))
  const itemOf = (product: string) => mappingByProduct.get(product)?.itemName ?? fallbackItemName(product)

  const lines: PurchaseLine[] = rows.map(r => ({
    date: r.purchaseDate.toISOString().slice(0, 10),
    productName: r.rawName,
    item: itemOf(r.rawName),
  }))
  const history = buildHistory(lines)

  const catalog = new Map<string, ItemInfo>()
  for (const [item, product] of history.lastProduct) {
    const mapping = mappingByProduct.get(product)
    catalog.set(item, { aisle: mapping?.aisle ?? 'Other', cupboard: mapping?.cupboard ?? false })
  }
  const items: MatchItem[] = [...history.dates.entries()]
    .map(([item, dates]) => ({ item, aisle: catalog.get(item)?.aisle ?? 'Other', bought: dates.length }))
    .sort((a, b) => a.item.localeCompare(b.item))

  return {
    history,
    catalog,
    items,
    unclassified: new Set(lines.filter(l => !mappingByProduct.has(l.productName)).map(l => l.productName)).size,
  }
}

export async function loadPurchaseContext(prisma: PrismaClient): Promise<PurchaseContext> {
  const [rows, mappings] = await Promise.all([
    prisma.purchaseHistory.findMany({ where: { orderNumber: { not: null } }, select: { rawName: true, purchaseDate: true } }),
    prisma.productMapping.findMany(),
  ])
  return buildPurchaseContext(rows, mappings)
}
