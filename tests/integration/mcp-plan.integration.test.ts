/**
 * MCP meal-plan tools, end to end against the test database: a real MCP client calls the real server, the way
 * Claude.ai does. Claude.ai is the agent, so these are plain data tools and writes go straight to the plan.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { testPrisma, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'
import { createMcpServer } from '@/lib/mcp/server'
import { parseDateParam } from '@/lib/dateUtils'

let client: Client
const WEEK = '2026-10-19'

async function call(name: string, args: Record<string, unknown>) {
  const res = await client.callTool({ name, arguments: args })
  const text = (res.content as Array<{ text: string }>)[0].text
  return { isError: res.isError === true, body: JSON.parse(text) }
}

describe('MCP plan tools (integration)', () => {
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
  beforeEach(async () => {
    await clearTestDatabase()
    await testPrisma.planDraft.deleteMany()
  })

  it('lists the plan tools next to the recipe tools', async () => {
    const names = (await client.listTools()).tools.map(t => t.name)
    for (const name of ['get_plan_days', 'get_day_notes', 'set_day_note', 'search_recipes', 'set_meal_slot', 'get_meal_plan', 'get_recipes', 'create_recipe']) {
      expect(names).toContain(name)
    }
  })

  it('draft a week the way Claude.ai would: notes, search, set slots, read it back', async () => {
    const fish = await testPrisma.recipe.create({ data: { name: 'Sea Bass', ingredients: 'x', tier: 'favorite', proteinType: 'fish', kind: 'quick' } })
    const rice = await testPrisma.recipe.create({ data: { name: 'Rice', ingredients: 'x', tier: 'favorite', carbType: 'rice' } })

    expect((await call('set_day_note', { date: '2026-10-20', note: 'football till 7' })).body).toMatchObject({ ok: true })
    expect((await call('get_day_notes', { from: WEEK, to: '2026-10-25' })).body.notes).toEqual([{ date: '2026-10-20', note: 'football till 7' }])

    const found = (await call('search_recipes', { slot: 'protein', kind: 'quick' })).body
    expect(found.recipes.map((r: { name: string }) => r.name)).toEqual(['Sea Bass'])

    const set = (await call('set_meal_slot', { date: '2026-10-20', slot: 'protein', recipe_id: found.recipes[0].id })).body
    expect(set).toMatchObject({ ok: true, changed: { day: 'Tuesday', slot: 'protein' } })
    expect((await call('set_meal_slot', { date: '2026-10-20', slot: 'carb', recipe_id: rice.id })).body.ok).toBe(true)

    const plan = (await call('get_plan_days', { from: WEEK, to: '2026-10-25' })).body
    expect(plan.days[1]).toMatchObject({ day: 'Tuesday', protein: { name: 'Sea Bass' }, carb: { name: 'Rice' } })
    expect(plan.days[0].protein).toBeNull()
    // the existing read tool sees the same plan
    expect((await call('get_meal_plan', { week_start_date: WEEK })).body.days[1]).toMatchObject({ protein: 'Sea Bass', carbs: 'Rice' })
    void fish
  })

  it('clears a note with an empty one, and refuses bad input without writing', async () => {
    await call('set_day_note', { date: '2026-10-20', note: 'out' })
    await call('set_day_note', { date: '2026-10-20', note: '' })
    expect(await testPrisma.dayNote.count()).toBe(0)
    expect((await call('set_day_note', { date: 'next tuesday', note: 'x' })).body).toMatchObject({ ok: false })
    expect((await call('set_meal_slot', { date: '2026-10-20', slot: 'protein', recipe_id: 'nope' })).body).toMatchObject({ ok: false })
    expect(await testPrisma.mealPlan.count()).toBe(0) // a refused write creates nothing
    const bad = await client.callTool({ name: 'set_meal_slot', arguments: { date: '2026-10-20', slot: 'dessert', recipe_id: null } })
    expect(bad.isError).toBe(true) // schema validation
  })

  it('warns when a draft is waiting in the app for that week', async () => {
    const r = await testPrisma.recipe.create({ data: { name: 'Sea Bass', ingredients: 'x', tier: 'favorite', proteinType: 'fish' } })
    await testPrisma.planDraft.create({ data: { weekStart: new Date(`${WEEK}T00:00:00.000Z`), days: [] } })
    const out = (await call('set_meal_slot', { date: '2026-10-21', slot: 'protein', recipe_id: r.id })).body
    expect(out).toMatchObject({ ok: true, warning: expect.stringContaining('draft waiting') })
    expect((await testPrisma.mealPlan.findFirst({ where: { date: parseDateParam('2026-10-21') } }))?.proteinRecipeId).toBe(r.id)
  })
})
