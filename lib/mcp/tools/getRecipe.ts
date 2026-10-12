import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { renderStepText } from '@/lib/recipeStepTokens'
import { jsonResult, errorResult } from '../recipeInput'

export async function getRecipeHandler({ id }: { id: string }) {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        structuredIngredients: { orderBy: { order: 'asc' } },
        steps: { orderBy: { order: 'asc' } },
      },
    })
    if (!recipe) {
      return jsonResult({ success: false, error: `No recipe with id "${id}". Use get_recipes to find recipe ids.` }, true)
    }

    const result = {
      recipe_id: recipe.id,
      name: recipe.name,
      kind: recipe.kind,
      servings: recipe.servings,
      description: recipe.description,
      total_time_minutes: recipe.totalTimeMinutes,
      notes: recipe.notes,
      has_method: recipe.steps.length > 0,
      ingredients: recipe.structuredIngredients.map((i, idx) => ({
        position: idx + 1,
        ingredient_id: i.id,
        name: i.name,
        amount: i.amount,
        unit: i.unit,
        quantity: i.quantity,
        notes: i.notes,
      })),
      steps: recipe.steps.map((s, idx) => ({
        position: idx + 1,
        // Readable text with amounts filled in (for showing to the user).
        text: renderStepText(s.text, recipe.structuredIngredients),
        // Text with {ing:<id>} references (send this back unchanged when re-submitting steps to update_recipe).
        text_with_references: s.text,
        timer_seconds: s.timerSeconds,
      })),
      metadata: {
        ...(recipe.proteinType ? { protein: recipe.proteinType } : {}),
        ...(recipe.carbType ? { carbs: recipe.carbType } : {}),
        ...(recipe.vegetableType ? { veg: recipe.vegetableType } : {}),
        ...(recipe.recipeUrl ? { source: recipe.recipeUrl } : {}),
      },
    }
    return jsonResult(result)
  } catch (err) {
    return errorResult(err)
  }
}

export function registerGetRecipe(server: McpServer) {
  server.registerTool(
    'get_recipe',
    {
      description: [
        'Returns ONE recipe in full: description, servings, time, notes, every ingredient (with ids and numeric amounts) and the complete method (steps with timers).',
        'Use it when the user asks about a specific recipe in their book ("what is in the lasagne?", "read me the method for Shini\'s dal"), and always before update_recipe so you edit what is really there. Get the id from get_recipes first.',
        'Read-only. If has_method is false the recipe has no steps yet; that is normal, not an error.',
      ].join('\n'),
      inputSchema: {
        id: z.string().describe('recipe_id from get_recipes or create_recipe'),
      },
    },
    getRecipeHandler
  )
}
