import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { jsonResult } from '../recipeInput'

export async function getRecipesHandler({ query }: { query?: string }) {
  const recipes = await prisma.recipe.findMany({
    where: query ? { name: { contains: query, mode: 'insensitive' } } : undefined,
    include: {
      structuredIngredients: { orderBy: { order: 'asc' } },
      _count: { select: { steps: true } },
    },
    orderBy: { name: 'asc' },
  })

  return jsonResult({
    recipes: recipes.map(r => ({
      recipe_id: r.id,
      name: r.name,
      kind: r.kind,
      has_method: r._count.steps > 0,
      servings: r.servings,
      ingredients: r.structuredIngredients.map(i => ({
        name: i.name,
        ...(i.quantity ? { quantity: [i.quantity, i.unit].filter(Boolean).join(' ') } : {}),
      })),
      metadata: {
        ...(r.proteinType ? { protein: r.proteinType } : {}),
        ...(r.carbType ? { carbs: r.carbType } : {}),
        ...(r.vegetableType ? { veg: r.vegetableType } : {}),
        ...(r.recipeUrl ? { source: r.recipeUrl } : {}),
      },
    })),
  })
}

export function registerGetRecipes(server: McpServer) {
  server.registerTool(
    'get_recipes',
    {
      description: [
        'Lists the recipes in the family recipe book: id, name, kind ("full" or "quick"), whether a method exists (has_method), servings, ingredients and metadata. Optionally filter by name.',
        'Use it to check what the user already has before suggesting or saving a recipe (avoid duplicates), to match ingredients they have to existing recipes, and to find a recipe_id. It does NOT return the method: call get_recipe with the id for that.',
        'Read-only.',
      ].join('\n'),
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe('Free-text filter on recipe name — case-insensitive substring match.'),
      },
    },
    getRecipesHandler
  )
}
