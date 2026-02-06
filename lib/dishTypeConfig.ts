/**
 * Dish Type Configuration
 *
 * Fetches protein and carb types from the database.
 * Used across recipe filters, forms, and meal plan components.
 */

import { prisma } from './prisma'

export interface DishTypeOption {
  value: string
  label: string
}

/**
 * Get protein options for forms (includes "None" option)
 */
export async function getProteinOptions(): Promise<DishTypeOption[]> {
  const types = await prisma.dishType.findMany({
    where: { category: 'protein' },
    orderBy: { order: 'asc' },
  })

  return [
    { value: '', label: 'None' },
    ...types.map(t => ({ value: t.value, label: t.label })),
  ]
}

/**
 * Get carb options for forms (includes "None" option)
 */
export async function getCarbOptions(): Promise<DishTypeOption[]> {
  const types = await prisma.dishType.findMany({
    where: { category: 'carb' },
    orderBy: { order: 'asc' },
  })

  return [
    { value: '', label: 'None' },
    ...types.map(t => ({ value: t.value, label: t.label })),
  ]
}

/**
 * Get protein options for filters (includes "All" option)
 */
export async function getProteinFilterOptions(): Promise<DishTypeOption[]> {
  const types = await prisma.dishType.findMany({
    where: { category: 'protein' },
    orderBy: { order: 'asc' },
  })

  return [
    { value: '', label: 'All' },
    ...types.map(t => ({ value: t.value, label: t.label })),
  ]
}

/**
 * Get carb options for filters (includes "All" option)
 */
export async function getCarbFilterOptions(): Promise<DishTypeOption[]> {
  const types = await prisma.dishType.findMany({
    where: { category: 'carb' },
    orderBy: { order: 'asc' },
  })

  return [
    { value: '', label: 'All' },
    ...types.map(t => ({ value: t.value, label: t.label })),
  ]
}

/**
 * Get all dish types for settings page
 */
export async function getAllDishTypes() {
  const types = await prisma.dishType.findMany({
    orderBy: [{ category: 'asc' }, { order: 'asc' }],
  })

  return {
    proteinTypes: types.filter(t => t.category === 'protein'),
    carbTypes: types.filter(t => t.category === 'carb'),
  }
}
