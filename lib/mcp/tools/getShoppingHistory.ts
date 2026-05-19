import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export function registerGetShoppingHistory(server: McpServer) {
  server.registerTool(
    'get_shopping_history',
    {
      description:
        'Returns all shopping lists with their items. Enables reasoning across history (e.g. "when did I last order X?"). Returns most recent first.',
      inputSchema: {
        limit: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Max number of lists to return, most recent first. Defaults to all.'),
      },
    },
    async ({ limit }) => {
      const lists = await prisma.shoppingList.findMany({
        orderBy: { createdAt: 'desc' },
        ...(limit ? { take: limit } : {}),
        include: { items: { orderBy: { order: 'asc' } } },
      })

      const result = {
        lists: lists.map(l => ({
          list_id: l.id,
          generated_at: l.createdAt.toISOString(),
          week_start_date: l.weekStart.toISOString().split('T')[0],
          items: l.items.map(i => ({
            name: i.name,
            source: i.source,
          })),
        })),
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
    }
  )
}
