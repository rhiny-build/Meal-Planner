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
  jsonResult,
  errorResult,
  type IngredientInput,
  type StepInput,
} from '../recipeInput'

export interface CreateRecipeArgs {
  name: string
  kind?: (typeof RECIPE_KINDS)[number]
  servings?: number
  description?: string
  totalTimeMinutes?: number
  notes?: string
  ingredients: IngredientInput[]
  steps?: StepInput[]
  metadata?: { carbs?: string; protein?: string; veg?: string; source?: string }
}

export async function createRecipeHandler(args: CreateRecipeArgs) {
  try {
    const { name, ingredients, steps = [], metadata = {} } = args
    if (!name.trim()) return jsonResult({ success: false, error: 'Recipe name is required' }, true)

    const rows = ingredients.map((i, idx) => toIngredientRow(i, idx))

    const recipe = await prisma.$transaction(async tx => {
      const created = await tx.recipe.create({
        data: {
          name: name.trim(),
          ingredients: toLegacyIngredientText(rows),
          carbType: metadata.carbs,
          proteinType: metadata.protein,
          vegetableType: metadata.veg,
          recipeUrl: metadata.source,
          tier: 'new',
          kind: args.kind ?? 'full',
          servings: args.servings ?? null,
          description: args.description ?? null,
          totalTimeMinutes: args.totalTimeMinutes ?? null,
          notes: args.notes ?? null,
          structuredIngredients: { create: rows },
        },
        include: { structuredIngredients: { orderBy: { order: 'asc' } } },
      })

      // Steps point at ingredients by position; swap in the real ids now that they exist.
      const resolved = resolveSteps(steps, created.structuredIngredients.map(i => i.id))
      if (!resolved.ok) throw new Error(resolved.error)
      if (resolved.steps.length > 0) {
        await tx.recipeStep.createMany({
          data: resolved.steps.map(s => ({ ...s, recipeId: created.id })),
        })
      }
      return { ...created, stepCount: resolved.steps.length }
    })

    return jsonResult({
      success: true,
      recipe_id: recipe.id,
      name: recipe.name,
      kind: recipe.kind,
      ingredient_count: recipe.structuredIngredients.length,
      step_count: recipe.stepCount,
    })
  } catch (err) {
    return errorResult(err)
  }
}

export function registerCreateRecipe(server: McpServer) {
  server.registerTool(
    'create_recipe',
    {
      description: [
        'Saves a NEW recipe to the family meal-planner app. This writes to the database.',
        'Call it only after the user has explicitly confirmed they want this recipe saved ("yes, save it"). Showing a recipe, or the user saying it looks good, is not confirmation: ask first, then call once. Never call it speculatively.',
        'Before saving, call get_recipes (with a name query) to check the recipe is not already in the book; if it is, use update_recipe instead of creating a duplicate.',
        'Give as much as you know: kind ("full" for a proper recipe, "quick" for a quick side or main such as chips or burgers), servings (how many people the ingredient amounts serve), description (one line), totalTimeMinutes, notes, and the method as steps. Every field except name and ingredients is optional. Never invent a method: if you do not have real steps, omit steps.',
        'Ingredients: give name, amount (a number) and unit separately where you can, e.g. {name:"plain flour", amount:300, unit:"g"}. Steps can mention an ingredient with {ing:N} (N = its 1-based position in your ingredients list); the app turns that into a live, servings-scaled amount.',
        'Returns {success, recipe_id}. On failure returns success:false with an error message and nothing is saved.',
      ].join('\n'),
      inputSchema: {
        name: z.string().describe('Recipe name'),
        kind: z.enum(RECIPE_KINDS).optional().describe('"full" (default) or "quick" (quick side/main, e.g. Simple Fries)'),
        servings: z.number().int().positive().optional().describe('How many people the ingredient amounts serve'),
        description: z.string().optional().describe('One-line description of the dish'),
        totalTimeMinutes: z.number().int().positive().optional().describe('Total time from start to table, in minutes'),
        notes: z.string().optional().describe('Tips, variations, anything worth remembering'),
        ingredients: z.array(ingredientInputSchema).describe('Ingredients in the order they should be listed'),
        steps: z.array(stepInputSchema).optional().describe('The method, in order. Omit if there is no real method.'),
        metadata: z
          .object({
            carbs: z.string().optional().describe('Carb type, e.g. "rice", "pasta"'),
            protein: z.string().optional().describe('Protein type, e.g. "chicken", "fish"'),
            veg: z.string().optional().describe('Vegetable type, e.g. "broccoli"'),
            source: z.string().optional().describe('Where the recipe is from: a URL or a name, e.g. "BBC Good Food", "Claude suggestion"'),
          })
          .optional()
          .describe('Classification and source'),
      },
    },
    createRecipeHandler
  )
}
