import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export function registerGetRecipes(server: McpServer) {
  server.registerTool(
    'get_recipes',
    {
      description:
        'Returns the full recipe catalogue with ingredients and metadata. Optionally filter by name. Use for ingredient matching or as context when suggesting new recipes.',
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe('Free-text filter on recipe name — case-insensitive substring match.'),
      },
    },
    async ({ query }) => {
      const recipes = await prisma.recipe.findMany({
        where: query
          ? { name: { contains: query, mode: 'insensitive' } }
          : undefined,
        include: { structuredIngredients: { orderBy: { order: 'asc' } } },
        orderBy: { name: 'asc' },
      })

      const result = {
        recipes: recipes.map(r => ({
          recipe_id: r.id,
          name: r.name,
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
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
    }
  )
}
