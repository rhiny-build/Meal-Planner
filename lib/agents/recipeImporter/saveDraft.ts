/**
 * Save a reviewed recipe draft into the recipe book.
 *
 * The importer itself never saves. After review, the UI posts the draft here.
 * Steps in a draft refer to ingredients by a temporary key ({ing:i1}); the real ingredient
 * ids only exist once the ingredients are created, so we create the recipe and its
 * ingredients first, then rewrite the keys to real ids and create the steps, all in one
 * transaction. The draft comes back from the browser, so it is re-validated first.
 */

import { prisma } from '@/lib/prisma'
import { buildDraft } from './tools'
import type { RecipeDraft } from './types'

/** One text line per ingredient, for the legacy Recipe.ingredients column. */
function ingredientLine(ing: RecipeDraft['ingredients'][number]): string {
  return [ing.quantity, ing.unit, ing.name, ing.notes ? `(${ing.notes})` : null].filter(Boolean).join(' ')
}

export async function saveRecipeDraft(rawDraft: unknown) {
  const raw = rawDraft as RecipeDraft
  const sourceUrl = typeof raw?.sourceUrl === 'string' && /^https?:\/\//i.test(raw.sourceUrl) ? raw.sourceUrl : null
  const draft = await buildDraft(raw, sourceUrl)

  return prisma.$transaction(async (tx) => {
    const recipe = await tx.recipe.create({
      data: {
        name: draft.name,
        kind: draft.kind,
        description: draft.description,
        servings: draft.servings,
        totalTimeMinutes: draft.totalTimeMinutes,
        prepTime: draft.prepTime,
        notes: draft.notes,
        recipeUrl: draft.sourceUrl,
        proteinType: draft.proteinType,
        carbType: draft.carbType,
        vegetableType: draft.includesVegetables ? 'vegetable' : null,
        tier: 'new',
        ingredients: draft.ingredients.map(ingredientLine).join('\n'),
        structuredIngredients: {
          create: draft.ingredients.map((ing, order) => ({
            name: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            amount: ing.amount,
            notes: ing.notes,
            order,
          })),
        },
      },
      include: { structuredIngredients: { orderBy: { order: 'asc' } } },
    })

    // draft key -> real ingredient id (ingredients were created in draft order)
    const idByKey = new Map(draft.ingredients.map((ing, i) => [ing.key, recipe.structuredIngredients[i].id]))

    if (draft.steps.length > 0) {
      await tx.recipeStep.createMany({
        data: draft.steps.map((step, order) => ({
          recipeId: recipe.id,
          order,
          text: step.text.replace(/\{ing:([A-Za-z0-9_-]+)\}/g, (whole, key: string) =>
            idByKey.has(key) ? `{ing:${idByKey.get(key)}}` : whole
          ),
          timerSeconds: step.timerSeconds,
        })),
      })
    }

    return recipe
  })
}
