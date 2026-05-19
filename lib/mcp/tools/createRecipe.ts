import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export function registerCreateRecipe(server: McpServer) {
  server.registerTool(
    'create_recipe',
    {
      description:
        'Persists a new recipe to the app. Only call this after the user has explicitly confirmed they want to save the recipe.',
      inputSchema: {
        name: z.string().describe('Recipe name'),
        ingredients: z
          .array(
            z.object({
              name: z.string().describe('Ingredient name — will be normalised server-side'),
              quantity: z.string().optional().describe('Amount including unit, e.g. "2 cups" or "500g"'),
            })
          )
          .describe('List of ingredients'),
        metadata: z
          .object({
            carbs: z.string().optional().describe('Carb type, e.g. "rice", "pasta"'),
            protein: z.string().optional().describe('Protein type, e.g. "chicken", "fish"'),
            veg: z.string().optional().describe('Vegetable type, e.g. "broccoli"'),
            source: z.string().optional().describe('Recipe source, e.g. "Claude suggestion", "BBC Good Food"'),
          })
          .describe('Recipe metadata'),
      },
    },
    async ({ name, ingredients, metadata }) => {
      try {
        const recipe = await prisma.recipe.create({
          data: {
            name,
            ingredients: ingredients.map(i => [i.quantity, i.name].filter(Boolean).join(' ')).join('\n'),
            carbType: metadata.carbs,
            proteinType: metadata.protein,
            vegetableType: metadata.veg,
            recipeUrl: metadata.source,
            tier: 'new',
            structuredIngredients: {
              create: ingredients.map((i, idx) => ({
                name: i.name,
                quantity: i.quantity ?? null,
                order: idx,
              })),
            },
          },
        })

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({ success: true, recipe_id: recipe.id, name: recipe.name }, null, 2),
            },
          ],
        }
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error',
              }),
            },
          ],
        }
      }
    }
  )
}
