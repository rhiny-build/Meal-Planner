'use server'

/**
 * Server actions for the "Next week" list: remember a tick, and correct an item or aisle.
 * Corrections stick: a corrected ProductMapping is never overwritten by the cheap model.
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { isAisle } from '@/lib/nextWeek/aisles'
import { fallbackItemName } from '@/lib/nextWeek/itemName'
import { tickDate } from '@/lib/nextWeek/loadNextWeek'

export async function setNextWeekTick(orderDate: string, key: string, ticked: boolean): Promise<void> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDate) || !key) throw new Error('Bad tick')
  await prisma.nextWeekTick.upsert({
    where: { orderDate_key: { orderDate: tickDate(orderDate), key } },
    create: { orderDate: tickDate(orderDate), key, ticked },
    update: { ticked },
  })
}

export interface ProductCorrection {
  /** The product shown on the line (its most recent purchase) */
  productName: string
  itemName: string
  aisle: string
}

export async function correctProduct({ productName, itemName, aisle }: ProductCorrection): Promise<void> {
  const item = itemName.trim().toLowerCase()
  if (!productName || !item || !isAisle(aisle)) throw new Error('Bad correction')

  const current = await prisma.productMapping.findUnique({ where: { productName } })
  const currentItem = current?.itemName ?? fallbackItemName(productName)
  await prisma.$transaction([
    // The aisle belongs to the item, so every product of the old item moves with it
    prisma.productMapping.updateMany({ where: { itemName: currentItem }, data: { aisle, corrected: true } }),
    prisma.productMapping.upsert({
      where: { productName },
      create: { productName, itemName: item, aisle, cupboard: current?.cupboard ?? false, corrected: true },
      update: { itemName: item, aisle, corrected: true },
    }),
  ])
  revalidatePath('/shopping-list')
}
