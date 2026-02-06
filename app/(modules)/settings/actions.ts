'use server'

/**
 * Settings Server Actions
 *
 * All mutations for the settings module.
 * Includes category management and dish type management.
 */

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'

// ============================================================
// Category Management Actions
// ============================================================

/**
 * Add a new category
 */
export async function addCategory(name: string) {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return { error: 'Category name is required' }
  }

  // Check for duplicate name
  const existing = await prisma.category.findUnique({
    where: { name: trimmedName },
  })

  if (existing) {
    return { error: 'A category with this name already exists' }
  }

  // Get max order for positioning
  const maxOrder = await prisma.category.aggregate({
    _max: { order: true },
  })

  const category = await prisma.category.create({
    data: {
      name: trimmedName,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  revalidatePath('/settings')
  revalidatePath('/shopping-list')
  return { category }
}

/**
 * Update a category's name
 */
export async function updateCategory(id: string, name: string) {
  const trimmedName = name.trim()

  if (!trimmedName) {
    return { error: 'Category name is required' }
  }

  // Check for duplicate name (excluding current category)
  const existing = await prisma.category.findFirst({
    where: {
      name: trimmedName,
      NOT: { id },
    },
  })

  if (existing) {
    return { error: 'A category with this name already exists' }
  }

  const category = await prisma.category.update({
    where: { id },
    data: { name: trimmedName },
  })

  revalidatePath('/settings')
  revalidatePath('/shopping-list')
  return { category }
}

/**
 * Delete a category
 * Blocked if the category has any items
 */
export async function deleteCategory(id: string) {
  // Check if category has items
  const itemCount = await prisma.masterListItem.count({
    where: { categoryId: id },
  })

  if (itemCount > 0) {
    return {
      error: `Cannot delete category with ${itemCount} item${itemCount === 1 ? '' : 's'}. Please move or delete all items first.`
    }
  }

  await prisma.category.delete({
    where: { id },
  })

  revalidatePath('/settings')
  revalidatePath('/shopping-list')
  return { success: true }
}

// ============================================================
// Dish Type Management Actions
// ============================================================

/**
 * Add a new dish type (protein or carb)
 */
export async function addDishType(
  category: 'protein' | 'carb',
  value: string,
  label: string
) {
  const trimmedValue = value.trim().toLowerCase().replace(/\s+/g, '-')
  const trimmedLabel = label.trim()

  if (!trimmedValue || !trimmedLabel) {
    return { error: 'Value and label are required' }
  }

  // Check for duplicate value within category
  const existing = await prisma.dishType.findUnique({
    where: { category_value: { category, value: trimmedValue } },
  })

  if (existing) {
    return { error: `A ${category} type with this value already exists` }
  }

  // Get max order for positioning
  const maxOrder = await prisma.dishType.aggregate({
    where: { category },
    _max: { order: true },
  })

  const dishType = await prisma.dishType.create({
    data: {
      value: trimmedValue,
      label: trimmedLabel,
      category,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  revalidatePath('/settings')
  revalidatePath('/recipes')
  return { dishType }
}

/**
 * Update a dish type's label
 */
export async function updateDishType(id: string, label: string) {
  const trimmedLabel = label.trim()

  if (!trimmedLabel) {
    return { error: 'Label is required' }
  }

  const dishType = await prisma.dishType.update({
    where: { id },
    data: { label: trimmedLabel },
  })

  revalidatePath('/settings')
  revalidatePath('/recipes')
  return { dishType }
}

/**
 * Delete a dish type
 * Returns warning if recipes use this type
 */
export async function deleteDishType(id: string) {
  // Get the dish type to check its value and category
  const dishType = await prisma.dishType.findUnique({
    where: { id },
  })

  if (!dishType) {
    return { error: 'Dish type not found' }
  }

  // Check if any recipes use this type
  const recipeField = dishType.category === 'protein' ? 'proteinType' : 'carbType'
  const recipeCount = await prisma.recipe.count({
    where: { [recipeField]: dishType.value },
  })

  if (recipeCount > 0) {
    return {
      error: `Cannot delete - ${recipeCount} recipe${recipeCount === 1 ? ' uses' : 's use'} this ${dishType.category} type. Update those recipes first.`
    }
  }

  await prisma.dishType.delete({
    where: { id },
  })

  revalidatePath('/settings')
  revalidatePath('/recipes')
  return { success: true }
}
