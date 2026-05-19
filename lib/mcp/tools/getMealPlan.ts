import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { parseStartDate, getWeekBounds } from '@/lib/mealPlanHelpers'

export function registerGetMealPlan(server: McpServer) {
  server.registerTool(
    'get_meal_plan',
    {
      description:
        'Returns the meal plan for a given week (lunch, protein, carbs, veg per day). Defaults to the current week.',
      inputSchema: {
        week_start_date: z
          .string()
          .optional()
          .describe('ISO 8601 date e.g. "2026-05-19". Defaults to the current configured week start.'),
      },
    },
    async ({ week_start_date }) => {
      const setting = await prisma.systemSetting.findUnique({ where: { key: 'weekStartDay' } })
      const startDay = setting ? parseInt(setting.value, 10) : 1

      const startDate = parseStartDate(week_start_date ?? null, startDay)
      const { startDate: weekStart, endDate: weekEnd } = getWeekBounds(startDate)

      const mealPlans = await prisma.mealPlan.findMany({
        where: { date: { gte: weekStart, lte: weekEnd } },
        include: {
          lunchRecipe: true,
          proteinRecipe: true,
          carbRecipe: true,
          vegetableRecipe: true,
        },
        orderBy: { date: 'asc' },
      })

      const result = {
        week_start_date: weekStart.toISOString().split('T')[0],
        plan_exists: mealPlans.some(
          m => m.lunchRecipeId || m.proteinRecipeId || m.carbRecipeId || m.vegetableRecipeId
        ),
        days: mealPlans.map(m => ({
          date: m.date.toISOString().split('T')[0],
          day_name: m.dayOfWeek,
          lunch: m.lunchRecipe?.name ?? null,
          protein: m.proteinRecipe?.name ?? null,
          carbs: m.carbRecipe?.name ?? null,
          veg: m.vegetableRecipe?.name ?? null,
        })),
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }
    }
  )
}
