import { McpServer } from '@modelcontextprotocol/sdk/server/mcp'
import { registerGetMealPlan } from './tools/getMealPlan'
import { registerGetShoppingHistory } from './tools/getShoppingHistory'
import { registerGetRecipes } from './tools/getRecipes'
import { registerCreateRecipe } from './tools/createRecipe'
import { registerGetRecipe } from './tools/getRecipe'
import { registerUpdateRecipe } from './tools/updateRecipe'

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'meal-planner',
    version: '0.2.0',
  })

  registerGetMealPlan(server)
  registerGetShoppingHistory(server)
  registerGetRecipes(server)
  registerGetRecipe(server)
  registerCreateRecipe(server)
  registerUpdateRecipe(server)

  return server
}
