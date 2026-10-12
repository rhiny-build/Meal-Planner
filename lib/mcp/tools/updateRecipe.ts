import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import {
  RECIPE_KINDS,
  ingredientInputSchema,
  stepInputSchema,
  toIngredientRow,
  toLegacyIngredientText,
  resolveSteps,
  remapStepTokens,
  jsonResult,
  errorResult,
  type IngredientInput,
  type StepInput,
} from '../recipeInput'

export interface UpdateRecipeArgs {
  id: string
  name?: string
  kind?: (typeof RECIPE_KINDS)[number]
  servings?: number | null
  description?: string | null
  totalTimeMinutes?: number | null
  notes?: string | null
  metadata?: { carbs?: string | null; protein?: string | null; veg?: string | null; source?: string | null }
  ingredients?: IngredientInput[]
  steps?: StepInput[]
}

export async function updateRecipeHandler(args: UpdateRecipeArgs) {
  try {
    const { id, ingredients, steps, metadata } = args
    if (args.name !== undefined && !args.name.trim()) {
      return jsonResult({ success: false, error: 'Recipe name cannot be empty' }, true)
    }

    const outcome = await prisma.$transaction(async tx => {
      const existing = await tx.recipe.findUnique({
        where: { id },
        include: {
          structuredIngredients: { orderBy: { order: 'asc' } },
          steps: { orderBy: { order: 'asc' } },
        },
      })
      if (!existing) throw new Error(`No recipe with id "${id}". Use get_recipes to find recipe ids.`)

      // Scalar fields: undefined = leave alone, null = clear.
      const data: Record<string, unknown> = {}
      if (args.name !== undefined) data.name = args.name.trim()
      if (args.kind !== undefined) data.kind = args.kind
      if (args.servings !== undefined) data.servings = args.servings
      if (args.description !== undefined) data.description = args.description
      if (args.totalTimeMinutes !== undefined) data.totalTimeMinutes = args.totalTimeMinutes
      if (args.notes !== undefined) data.notes = args.notes
      if (metadata?.carbs !== undefined) data.carbType = metadata.carbs
      if (metadata?.protein !== undefined) data.proteinType = metadata.protein
      if (metadata?.veg !== undefined) data.vegetableType = metadata.veg
      if (metadata?.source !== undefined) data.recipeUrl = metadata.source

      let finalIngredients = existing.structuredIngredients
      let keptStepsRemapped: Array<{ order: number; text: string; timerSeconds: number | null }> | null = null

      if (ingredients !== undefined) {
        const rows = ingredients.map((i, idx) => toIngredientRow(i, idx))
        await tx.ingredient.deleteMany({ where: { recipeId: id } })
        await tx.ingredient.createMany({ data: rows.map(r => ({ ...r, recipeId: id })) })
        finalIngredients = await tx.ingredient.findMany({ where: { recipeId: id }, orderBy: { order: 'asc' } })
        data.ingredients = toLegacyIngredientText(rows)

        // Keeping the old method: re-point its ingredient tokens at the new ingredients.
        if (steps === undefined && existing.steps.length > 0) {
          const oldNames = new Map(existing.structuredIngredients.map(i => [i.id, i.name]))
          const newIds = new Map<string, string>()
          for (const i of finalIngredients) {
            const key = i.name.trim().toLowerCase()
            if (!newIds.has(key)) newIds.set(key, i.id)
          }
          keptStepsRemapped = existing.steps.map(s => ({
            order: s.order,
            text: remapStepTokens(s.text, oldNames, newIds),
            timerSeconds: s.timerSeconds,
          }))
        }
      }

      let newSteps = keptStepsRemapped
      if (steps !== undefined) {
        const resolved = resolveSteps(steps, finalIngredients.map(i => i.id))
        if (!resolved.ok) throw new Error(resolved.error)
        newSteps = resolved.steps
      }
      if (newSteps) {
        await tx.recipeStep.deleteMany({ where: { recipeId: id } })
        if (newSteps.length > 0) {
          await tx.recipeStep.createMany({ data: newSteps.map(s => ({ ...s, recipeId: id })) })
        }
      }

      const updated = Object.keys(data).length > 0
        ? await tx.recipe.update({ where: { id }, data })
        : existing

      return {
        recipe: updated,
        ingredientCount: finalIngredients.length,
        stepCount: newSteps ? newSteps.length : existing.steps.length,
        changed: [
          ...Object.keys(data).filter(k => k !== 'ingredients'),
          ...(ingredients !== undefined ? ['ingredients'] : []),
          ...(newSteps ? ['steps'] : []),
        ],
      }
    })

    return jsonResult({
      success: true,
      recipe_id: outcome.recipe.id,
      name: outcome.recipe.name,
      changed: outcome.changed,
      ingredient_count: outcome.ingredientCount,
      step_count: outcome.stepCount,
    })
  } catch (err) {
    return errorResult(err)
  }
}

export function registerUpdateRecipe(server: McpServer) {
  server.registerTool(
    'update_recipe',
    {
      description: [
        'Changes an EXISTING recipe in the family meal-planner app. This overwrites data.',
        'Call it only after the user has confirmed the change. "Confirmed" means: you have told the user exactly what you are about to change (for example the full method you will add, or the new ingredient list) and they have said yes. Do not call it just because they described a recipe; show what you will save, ask, then call once.',
        'Always call get_recipe first and base the change on what is there, so you do not wipe out existing steps or ingredients by accident.',
        'It is a patch: only the fields you send are changed. Send null to clear servings, description, totalTimeMinutes, notes or a metadata field.',
        '"steps" REPLACES the whole method (send every step, in order; send [] to remove the method). "ingredients" REPLACES the whole ingredient list (send every ingredient). Leave them out to keep what is there.',
        'Steps mention ingredients with {ing:N}, N = the 1-based position in the final ingredient list. If you re-send steps unchanged from get_recipe, use each step\'s text_with_references. If you replace ingredients without sending steps, existing references are re-pointed to the new ingredients with the same name.',
        'Typical use: a family recipe is already saved without a method; the user describes how they make it; you write steps, confirm, then call update_recipe with just {id, steps} (and servings if known). Never invent a method the user did not give you.',
        'Returns {success, changed}. On failure returns success:false with an error and nothing is changed.',
      ].join('\n'),
      inputSchema: {
        id: z.string().describe('recipe_id of the recipe to change (from get_recipes)'),
        name: z.string().optional().describe('New name'),
        kind: z.enum(RECIPE_KINDS).optional().describe('"full" or "quick"'),
        servings: z.number().int().positive().nullable().optional().describe('How many people the ingredient amounts serve'),
        description: z.string().nullable().optional().describe('One-line description'),
        totalTimeMinutes: z.number().int().positive().nullable().optional().describe('Total time in minutes'),
        notes: z.string().nullable().optional().describe('Tips or variations'),
        metadata: z
          .object({
            carbs: z.string().nullable().optional(),
            protein: z.string().nullable().optional(),
            veg: z.string().nullable().optional(),
            source: z.string().nullable().optional().describe('A URL or name of where the recipe is from'),
          })
          .optional()
          .describe('Classification and source; only the fields you send change'),
        ingredients: z.array(ingredientInputSchema).optional().describe('Complete replacement ingredient list'),
        steps: z.array(stepInputSchema).optional().describe('Complete replacement method, in order'),
      },
    },
    updateRecipeHandler
  )
}
