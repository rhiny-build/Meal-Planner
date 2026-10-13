/**
 * MCP recipe tools, end to end against the test database.
 *
 * Connects a real MCP client to the real server (in-memory transport) and calls
 * the tools the way Claude.ai does, so schema validation, handlers and the
 * database are all exercised.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { testPrisma, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'
import { createMcpServer } from '@/lib/mcp/server'

let client: Client

async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args })
  const text = (res.content as Array<{ text: string }>)[0].text
  return { isError: res.isError === true, body: JSON.parse(text) }
}

describe('MCP recipe tools (integration)', () => {
  beforeAll(async () => {
    await setupTestDatabase()
    const server = createMcpServer()
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair()
    client = new Client({ name: 'test', version: '1.0.0' })
    await Promise.all([server.connect(serverSide), client.connect(clientSide)])
  })
  afterAll(async () => {
    await client.close()
    await teardownTestDatabase()
  })
  beforeEach(async () => { await clearTestDatabase() })

  const pancakes = {
    name: 'Fluffy Pancakes',
    kind: 'full',
    servings: 4,
    description: 'Thick American-style pancakes',
    totalTimeMinutes: 25,
    notes: 'Do not overmix',
    ingredients: [
      { name: 'plain flour', amount: 300, unit: 'g' },
      { name: 'milk', amount: 1.5, unit: 'cups', quantity: '1 1/2' },
      { name: 'egg', quantity: '2' },
      { name: 'salt', quantity: 'a pinch' },
    ],
    steps: [
      { text: 'Whisk {ing:1}, {ing:2} and {ing:3} into a smooth batter.' },
      { text: 'Rest the batter.', timerSeconds: 600 },
      { text: 'Season with {ing:4} and fry.' },
    ],
    metadata: { protein: 'egg', source: 'Claude suggestion' },
  }

  it('lists the five tools', async () => {
    const { tools } = await client.listTools()
    expect(tools.map(t => t.name).sort()).toEqual(
      ['create_recipe', 'get_meal_plan', 'get_recipe', 'get_recipes', 'get_shopping_history', 'update_recipe']
    )
  })

  it('create_recipe saves fields, amounts and id-token steps; get_recipe reads them back', async () => {
    const created = await call('create_recipe', pancakes)
    expect(created.body).toMatchObject({ success: true, ingredient_count: 4, step_count: 3, kind: 'full' })

    const recipe = await testPrisma.recipe.findUniqueOrThrow({
      where: { id: created.body.recipe_id },
      include: { structuredIngredients: { orderBy: { order: 'asc' } }, steps: { orderBy: { order: 'asc' } } },
    })
    expect(recipe).toMatchObject({ servings: 4, totalTimeMinutes: 25, notes: 'Do not overmix', tier: 'new', proteinType: 'egg' })
    expect(recipe.structuredIngredients.map(i => i.amount)).toEqual([300, 1.5, 2, null])
    const [flour, milk, egg] = recipe.structuredIngredients
    expect(recipe.steps[0].text).toBe(`Whisk {ing:${flour.id}}, {ing:${milk.id}} and {ing:${egg.id}} into a smooth batter.`)
    expect(recipe.steps[1].timerSeconds).toBe(600)

    const got = await call('get_recipe', { id: created.body.recipe_id })
    expect(got.body.steps[0].text).toBe('Whisk 300 g plain flour, 1.5 cups milk and 2 egg into a smooth batter.')
    expect(got.body.steps[0].text_with_references).toBe(recipe.steps[0].text)
    expect(got.body.has_method).toBe(true)
  })

  it('create_recipe still accepts the old shape', async () => {
    const created = await call('create_recipe', {
      name: 'Old Style',
      ingredients: [{ name: 'rice', quantity: '2 cups' }, { name: 'peas' }],
      metadata: { carbs: 'rice', source: 'BBC Good Food' },
    })
    expect(created.body.success).toBe(true)
    const recipe = await testPrisma.recipe.findUniqueOrThrow({ where: { id: created.body.recipe_id }, include: { steps: true } })
    expect(recipe).toMatchObject({ kind: 'full', servings: null, carbType: 'rice', recipeUrl: 'BBC Good Food' })
    expect(recipe.steps).toHaveLength(0)
  })

  it('rejects a bad step reference and saves nothing', async () => {
    const res = await call('create_recipe', { name: 'Bad', ingredients: [{ name: 'a' }], steps: [{ text: 'Use {ing:7}' }] })
    expect(res.isError).toBe(true)
    expect(res.body.success).toBe(false)
    expect(await testPrisma.recipe.count()).toBe(0)
  })

  it('get_recipes shows kind and has_method without steps', async () => {
    await call('create_recipe', pancakes)
    await call('create_recipe', { name: 'Simple Fries', kind: 'quick', ingredients: [{ name: 'potato' }] })
    const { body } = await call('get_recipes', {})
    const byName = Object.fromEntries(body.recipes.map((r: { name: string }) => [r.name, r]))
    expect(byName['Fluffy Pancakes']).toMatchObject({ kind: 'full', has_method: true, servings: 4 })
    expect(byName['Simple Fries']).toMatchObject({ kind: 'quick', has_method: false })
    expect(JSON.stringify(body)).not.toContain('Whisk')
    expect((await call('get_recipes', { query: 'fries' })).body.recipes).toHaveLength(1)
  })

  it('update_recipe adds a method to a recipe saved without one', async () => {
    const created = await call('create_recipe', {
      name: "Shini's Dal",
      ingredients: [{ name: 'red lentils', amount: 250, unit: 'g' }, { name: 'onion', amount: 1 }],
    })
    const id = created.body.recipe_id
    expect((await call('get_recipe', { id })).body.has_method).toBe(false)

    const upd = await call('update_recipe', {
      id, servings: 4, kind: 'full',
      steps: [{ text: 'Rinse {ing:1} until the water runs clear.' }, { text: 'Fry {ing:2}, add lentils and simmer.', timerSeconds: 1200 }],
    })
    expect(upd.body).toMatchObject({ success: true, changed: ['kind', 'servings', 'steps'], step_count: 2 })

    const got = (await call('get_recipe', { id })).body
    expect(got.servings).toBe(4)
    expect(got.steps).toHaveLength(2)
    expect(got.steps[0].text).toBe('Rinse 250 g red lentils until the water runs clear.')
    expect(got.steps[1].timer_seconds).toBe(1200)
    expect(got.ingredients).toHaveLength(2)
  })

  it('update_recipe replaces ingredients and keeps existing steps pointing at the right ones', async () => {
    const created = await call('create_recipe', pancakes)
    const id = created.body.recipe_id
    const upd = await call('update_recipe', {
      id,
      ingredients: [
        { name: 'egg', amount: 3 },
        { name: 'plain flour', amount: 400, unit: 'g' },
        { name: 'milk', amount: 500, unit: 'ml' },
      ],
    })
    expect(upd.body).toMatchObject({ success: true, ingredient_count: 3, step_count: 3 })
    const got = (await call('get_recipe', { id })).body
    expect(got.steps[0].text).toBe('Whisk 400 g plain flour, 500 ml milk and 3 egg into a smooth batter.')
    // salt was dropped: its token falls back to the plain name
    expect(got.steps[2].text).toBe('Season with salt and fry.')
    const recipe = await testPrisma.recipe.findUniqueOrThrow({ where: { id } })
    expect(recipe.ingredients).toBe('3 egg\n400 g plain flour\n500 ml milk')
  })

  it('update_recipe clears fields with null, patches metadata, and can remove the method', async () => {
    const created = await call('create_recipe', pancakes)
    const id = created.body.recipe_id
    const upd = await call('update_recipe', { id, notes: null, metadata: { protein: null, carbs: 'flour' }, steps: [] })
    expect(upd.body.success).toBe(true)
    const recipe = await testPrisma.recipe.findUniqueOrThrow({ where: { id }, include: { steps: true } })
    expect(recipe).toMatchObject({ notes: null, proteinType: null, carbType: 'flour', servings: 4 })
    expect(recipe.steps).toHaveLength(0)
  })

  it('update_recipe and get_recipe report unknown ids; a failed update changes nothing', async () => {
    expect((await call('get_recipe', { id: 'nope' })).isError).toBe(true)
    expect((await call('update_recipe', { id: 'nope', name: 'x' })).isError).toBe(true)

    const created = await call('create_recipe', pancakes)
    const id = created.body.recipe_id
    const bad = await call('update_recipe', { id, name: 'Renamed', steps: [{ text: 'Use {ing:99}' }] })
    expect(bad.body.success).toBe(false)
    const recipe = await testPrisma.recipe.findUniqueOrThrow({ where: { id }, include: { steps: true } })
    expect(recipe.name).toBe('Fluffy Pancakes')
    expect(recipe.steps).toHaveLength(3)
  })
})
