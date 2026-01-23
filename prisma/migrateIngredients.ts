/**
 * Migration Script: Convert existing recipe ingredient strings to structured Ingredient records
 *
 * This script reads all recipes and splits their ingredient text (one per line)
 * into individual Ingredient records. The original string field is preserved.
 *
 * Usage: npx ts-node prisma/migrateIngredients.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Parse an ingredient line into structured components
 * Examples:
 * - "2 cups flour" -> { quantity: "2", unit: "cups", name: "flour" }
 * - "1/2 teaspoon salt" -> { quantity: "1/2", unit: "teaspoon", name: "salt" }
 * - "chicken breast, diced" -> { name: "chicken breast", notes: "diced" }
 * - "Salt and pepper to taste" -> { name: "Salt and pepper", notes: "to taste" }
 */
function parseIngredientLine(line: string): {
  name: string
  quantity?: string
  unit?: string
  notes?: string
} {
  const trimmed = line.trim()
  if (!trimmed) {
    return { name: '' }
  }

  // Common units for matching
  const unitPatterns = [
    'cups?', 'tablespoons?', 'tbsp', 'teaspoons?', 'tsp',
    'pounds?', 'lbs?', 'ounces?', 'oz',
    'grams?', 'g', 'kilograms?', 'kg',
    'ml', 'milliliters?', 'liters?', 'l',
    'pieces?', 'slices?', 'cloves?', 'heads?',
    'bunche?s?', 'stalks?', 'sprigs?', 'leaves?',
    'cans?', 'jars?', 'packages?', 'boxes?', 'bags?',
    'pinch(?:es)?', 'dash(?:es)?', 'handfuls?',
    'large', 'medium', 'small'
  ].join('|')

  // Pattern: [quantity] [unit] [name], [notes]
  // Quantity can be: whole number, fraction, decimal, or combo like "1 1/2"
  const quantityPattern = /^(\d+(?:\s+\d+)?(?:\/\d+)?(?:\.\d+)?)\s*/
  const unitPattern = new RegExp(`^(${unitPatterns})\\s+`, 'i')

  let remaining = trimmed
  let quantity: string | undefined
  let unit: string | undefined
  let notes: string | undefined

  // Extract quantity if present
  const quantityMatch = remaining.match(quantityPattern)
  if (quantityMatch) {
    quantity = quantityMatch[1]
    remaining = remaining.slice(quantityMatch[0].length)
  }

  // Extract unit if present
  const unitMatch = remaining.match(unitPattern)
  if (unitMatch) {
    unit = unitMatch[1].toLowerCase()
    remaining = remaining.slice(unitMatch[0].length)
  }

  // Check for notes in parentheses or after comma
  const notesInParens = remaining.match(/\s*\(([^)]+)\)\s*$/)
  const notesAfterComma = remaining.match(/,\s*([^,]+)$/)

  if (notesInParens) {
    notes = notesInParens[1].trim()
    remaining = remaining.slice(0, -notesInParens[0].length)
  } else if (notesAfterComma) {
    notes = notesAfterComma[1].trim()
    remaining = remaining.slice(0, -notesAfterComma[0].length)
  }

  return {
    name: remaining.trim(),
    quantity,
    unit,
    notes,
  }
}

async function migrateIngredients() {
  console.log('Starting ingredient migration...')

  // Get all recipes
  const recipes = await prisma.recipe.findMany({
    include: { structuredIngredients: true },
  })

  console.log(`Found ${recipes.length} recipes to process`)

  let migratedCount = 0
  let skippedCount = 0
  let ingredientCount = 0

  for (const recipe of recipes) {
    // Skip if already has structured ingredients
    if (recipe.structuredIngredients.length > 0) {
      console.log(`Skipping "${recipe.name}" - already has structured ingredients`)
      skippedCount++
      continue
    }

    // Skip if no ingredients text
    if (!recipe.ingredients || recipe.ingredients.trim() === '') {
      console.log(`Skipping "${recipe.name}" - no ingredients text`)
      skippedCount++
      continue
    }

    // Split ingredients by newline
    const lines = recipe.ingredients
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    // Parse and create structured ingredients
    const ingredientData = lines.map((line, index) => {
      const parsed = parseIngredientLine(line)
      return {
        recipeId: recipe.id,
        name: parsed.name || line, // Fallback to full line if parsing fails
        quantity: parsed.quantity || null,
        unit: parsed.unit || null,
        notes: parsed.notes || null,
        order: index,
      }
    })

    // Filter out empty names
    const validIngredients = ingredientData.filter((ing) => ing.name.length > 0)

    if (validIngredients.length > 0) {
      await prisma.ingredient.createMany({
        data: validIngredients,
      })

      ingredientCount += validIngredients.length
      console.log(
        `Migrated "${recipe.name}": ${validIngredients.length} ingredients`
      )
    }

    migratedCount++
  }

  console.log('\n--- Migration Complete ---')
  console.log(`Recipes processed: ${migratedCount}`)
  console.log(`Recipes skipped: ${skippedCount}`)
  console.log(`Total ingredients created: ${ingredientCount}`)
}

migrateIngredients()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
