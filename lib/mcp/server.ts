import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { registerGetMealPlan } from './tools/getMealPlan'
import { registerGetShoppingHistory } from './tools/getShoppingHistory'
import { registerGetRecipes } from './tools/getRecipes'
import { registerCreateRecipe } from './tools/createRecipe'

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'meal-planner',
    version: '0.1.0',
  })

  registerGetMealPlan(server)
  registerGetShoppingHistory(server)
  registerGetRecipes(server)
  registerCreateRecipe(server)

  return server
}
