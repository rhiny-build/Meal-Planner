// @vitest-environment node
/**
 * Meal-plan agent: the plan/draft stores, the tools, drafts (made, tweaked, accepted, thrown away), the agent on the SDK
 * tool runner with scripted (replayed) model responses, and the Next week list picking up an accepted plan.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { testPrisma, setupTestDatabase, teardownTestDatabase, clearTestDatabase } from './setup'
import { parseDateParam } from '@/lib/dateUtils'
import { acceptDraft, createDraft, discardDraft, getDraft, saveDraftEdits } from '@/lib/mealPlanAgent/draft'
import { createDraftStore, createPlanStore } from '@/lib/mealPlanAgent/planStore'
import { runPlanAgent } from '@/lib/mealPlanAgent/runPlanAgent'
import { readDayNotes, readPlanDays, searchRecipeBook, setMealSlot } from '@/lib/mealPlanAgent/tools'
import { loadNextWeek } from '@/lib/nextWeek/loadNextWeek'
import { scriptedClaude, toolResultsIn } from '../helpers/scriptedClaude'

const WEEK = '2026-10-19' // a Monday
const TODAY = '2026-10-14'
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const key = (offset: number, from = WEEK) => {
  const d = parseDateParam(from)
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let ids: Record<string, string>

async function seedRecipes() {
  const make = (name: string, data: object) => testPrisma.recipe.create({ data: { name, ingredients: 'x', tier: 'favorite', ...data } })
  const rows = await Promise.all([
    make('Sea Bass', { proteinType: 'fish', kind: 'quick', prepTime: 'quick' }),
    make('Chicken Schnitzel', { proteinType: 'chicken' }),
    make('Beef Keema', { proteinType: 'red-meat', tier: 'non-regular' }),
    make('Burgers', { proteinType: 'red-meat', kind: 'quick' }),
    make('Basmati Rice', { carbType: 'rice' }),
    make('Fries', { carbType: 'fries' }),
    make('Broccoli', { vegetableType: 'broccoli' }),
    make('Peas', { vegetableType: 'peas' }),
    make('Plain Soup', {}), // fits no slot
  ])
  ids = Object.fromEntries(rows.map(r => [r.name, r.id]))
}

/** Save a week of plan rows. `days`: slot ids per day index. */
async function savePlan(weekStart: string, days: Record<number, { protein?: string; carb?: string; vegetable?: string; lunch?: string }>) {
  for (let i = 0; i < 7; i++) {
    const d = days[i] ?? {}
    await testPrisma.mealPlan.create({
      data: {
        date: parseDateParam(key(i, weekStart)), dayOfWeek: DAY_NAMES[i],
        proteinRecipeId: d.protein ?? null, carbRecipeId: d.carb ?? null, vegetableRecipeId: d.vegetable ?? null, lunchRecipeId: d.lunch ?? null,
      },
    })
  }
}

describe('Meal-plan agent (integration)', () => {
  beforeAll(async () => { await setupTestDatabase() })
  afterAll(async () => { await teardownTestDatabase() })
  beforeEach(async () => {
    await clearTestDatabase()
    await testPrisma.planDraft.deleteMany()
    await seedRecipes()
  })

  describe('read tools', () => {
    it('read_plan returns names, empty slots as null, and fills days without a row', async () => {
      await savePlan(WEEK, { 0: { protein: ids['Sea Bass'], carb: ids['Fries'] } })
      const out = await readPlanDays(testPrisma, createPlanStore(testPrisma), { from: WEEK, to: key(8) })
      expect('days' in out && out.days).toHaveLength(9)
      const days = (out as { days: Array<{ date: string; protein: { name: string } | null; carb: { name: string } | null }> }).days
      expect(days[0].protein?.name).toBe('Sea Bass')
      expect(days[0].carb?.name).toBe('Fries')
      expect(days[1].protein).toBeNull()
      expect(days[8].date).toBe(key(8)) // a day beyond the saved week
    })

    it('rejects a bad or backwards range', async () => {
      const store = createPlanStore(testPrisma)
      expect(await readPlanDays(testPrisma, store, { from: 'tomorrow', to: WEEK })).toHaveProperty('error')
      expect(await readPlanDays(testPrisma, store, { from: WEEK, to: key(-1) })).toHaveProperty('error')
    })

    it('read_day_notes returns the notes in range only', async () => {
      await testPrisma.dayNote.createMany({
        data: [
          { date: new Date(`${key(1)}T00:00:00.000Z`), text: 'football till 7' },
          { date: new Date(`${key(3)}T00:00:00.000Z`), text: 'out' },
          { date: new Date(`${key(9)}T00:00:00.000Z`), text: 'next week' },
        ],
      })
      const out = await readDayNotes(testPrisma, { from: WEEK, to: key(6) })
      expect(out).toEqual({ notes: [{ date: key(1), note: 'football till 7' }, { date: key(3), note: 'out' }] })
    })
  })

  describe('search_recipes', () => {
    it('filters by slot, kind, tier and name, quick recipes fit any slot', async () => {
      const proteins = await searchRecipeBook(testPrisma, { slot: 'protein' }, TODAY)
      expect(proteins.recipes.map(r => r.name).sort()).toEqual(['Beef Keema', 'Burgers', 'Chicken Schnitzel', 'Sea Bass'])
      expect((await searchRecipeBook(testPrisma, { slot: 'carb' }, TODAY)).recipes.map(r => r.name).sort()).toEqual(['Basmati Rice', 'Burgers', 'Fries', 'Sea Bass'])
      expect((await searchRecipeBook(testPrisma, { kind: 'quick' }, TODAY)).recipes.map(r => r.name).sort()).toEqual(['Burgers', 'Sea Bass'])
      expect((await searchRecipeBook(testPrisma, { tier: 'non-regular' }, TODAY)).recipes.map(r => r.name)).toEqual(['Beef Keema'])
      expect((await searchRecipeBook(testPrisma, { query: 'keema' }, TODAY)).recipes).toHaveLength(1)
    })

    it('shows when each recipe was last on the plan, orders longest-since first, and can leave out recent repeats', async () => {
      // Sea Bass 5 days ago, Chicken Schnitzel 20 days ago, never the others
      await testPrisma.mealPlan.create({ data: { date: parseDateParam(key(-5, TODAY)), dayOfWeek: 'Friday', proteinRecipeId: ids['Sea Bass'] } })
      await testPrisma.mealPlan.create({ data: { date: parseDateParam(key(-20, TODAY)), dayOfWeek: 'Saturday', proteinRecipeId: ids['Chicken Schnitzel'] } })
      const all = (await searchRecipeBook(testPrisma, { slot: 'protein' }, TODAY)).recipes
      expect(all.map(r => r.name).slice(-2)).toEqual(['Chicken Schnitzel', 'Sea Bass']) // never-planned first, most recent last
      expect(all.find(r => r.name === 'Sea Bass')).toMatchObject({ lastOnPlan: key(-5, TODAY), daysSinceOnPlan: 5 })
      expect(all.find(r => r.name === 'Beef Keema')?.daysSinceOnPlan).toBeUndefined()

      const notRecent = (await searchRecipeBook(testPrisma, { slot: 'protein', notOnPlanInLastDays: 14 }, TODAY)).recipes.map(r => r.name)
      expect(notRecent).not.toContain('Sea Bass')
      expect(notRecent).toContain('Chicken Schnitzel')
    })

    it('ignores plan rows after the as-of date', async () => {
      await testPrisma.mealPlan.create({ data: { date: parseDateParam(key(3, TODAY)), dayOfWeek: 'Sunday', proteinRecipeId: ids['Burgers'] } })
      const hit = (await searchRecipeBook(testPrisma, { slot: 'protein', query: 'burgers' }, TODAY)).recipes[0]
      expect(hit.lastOnPlan).toBeUndefined()
    })
  })

  describe('set_meal_slot on the saved plan', () => {
    it('sets and clears a slot, creating the week rows on first use, and marks the shopping list stale', async () => {
      await testPrisma.shoppingList.create({ data: { weekStart: parseDateParam(WEEK), stale: false } })
      const store = createPlanStore(testPrisma)
      const set = await setMealSlot(testPrisma, store, { date: key(2), slot: 'protein', recipe_id: ids['Sea Bass'] })
      expect(set).toMatchObject({ ok: true, changed: { day: 'Wednesday', slot: 'protein', now: ids['Sea Bass'] } })
      expect(await testPrisma.mealPlan.count()).toBe(7)
      expect((await testPrisma.shoppingList.findFirst())?.stale).toBe(true)

      const cleared = await setMealSlot(testPrisma, store, { date: key(2), slot: 'protein', recipe_id: null })
      expect(cleared).toMatchObject({ ok: true, changed: { was: ids['Sea Bass'], now: null } })
    })

    it('does not duplicate the week when the Week page later creates it', async () => {
      await setMealSlot(testPrisma, createPlanStore(testPrisma), { date: key(4), slot: 'carb', recipe_id: ids['Fries'] })
      const rows = await testPrisma.mealPlan.findMany({ orderBy: { date: 'asc' } })
      expect(new Set(rows.map(r => r.dayOfWeek)).size).toBe(7)
    })

    it('refuses an unknown recipe, a recipe that does not fit the slot, and a bad date', async () => {
      const store = createPlanStore(testPrisma)
      expect(await setMealSlot(testPrisma, store, { date: key(0), slot: 'protein', recipe_id: 'nope' })).toMatchObject({ ok: false })
      const wrongSlot = await setMealSlot(testPrisma, store, { date: key(0), slot: 'protein', recipe_id: ids['Basmati Rice'] })
      expect(wrongSlot).toMatchObject({ ok: false, error: expect.stringContaining('not a protein recipe') })
      expect(await setMealSlot(testPrisma, store, { date: key(0), slot: 'protein', recipe_id: ids['Plain Soup'] })).toMatchObject({ ok: false })
      expect(await setMealSlot(testPrisma, store, { date: '2026-02-31', slot: 'protein', recipe_id: ids['Sea Bass'] })).toMatchObject({ ok: false })
    })

    it('warns (never blocks) when the recipe was on the plan in the 3 weeks before', async () => {
      await testPrisma.mealPlan.create({ data: { date: parseDateParam(key(-6)), dayOfWeek: 'Tuesday', proteinRecipeId: ids['Burgers'] } })
      const out = await setMealSlot(testPrisma, createPlanStore(testPrisma), { date: key(1), slot: 'protein', recipe_id: ids['Burgers'] })
      expect(out).toMatchObject({ ok: true, warning: expect.stringContaining('already on the plan') })
    })
  })

  describe('drafts', () => {
    it('start from the saved week: filled slots are kept and locked, the draft is not the plan', async () => {
      await savePlan(WEEK, { 1: { protein: ids['Burgers'] } })
      await createDraft(testPrisma, WEEK)
      const store = createDraftStore(testPrisma, WEEK)

      const blocked = await setMealSlot(testPrisma, store, { date: key(1), slot: 'protein', recipe_id: ids['Sea Bass'] })
      expect(blocked).toMatchObject({ ok: false, error: expect.stringContaining('already chose') })
      const ok = await setMealSlot(testPrisma, store, { date: key(1), slot: 'carb', recipe_id: ids['Fries'], reason: 'Football till 7: quick' })
      expect(ok).toMatchObject({ ok: true })

      const draft = await getDraft(testPrisma, WEEK)
      expect(draft?.days[1]).toMatchObject({ protein: ids['Burgers'], carb: ids['Fries'], reason: 'Football till 7: quick', locked: ['protein'] })
      // nothing counts as the plan until accepted
      expect((await testPrisma.mealPlan.findFirst({ where: { date: parseDateParam(key(1)) } }))?.carbRecipeId).toBeNull()
    })

    it('parallel slot changes (the tool runner runs a reply\'s calls at once) do not overwrite each other', async () => {
      await createDraft(testPrisma, WEEK)
      const store = createDraftStore(testPrisma, WEEK)
      const calls = Array.from({ length: 7 }, (_, i) => setMealSlot(testPrisma, store, { date: key(i), slot: 'protein', recipe_id: ids['Sea Bass'] }))
      await Promise.all(calls)
      expect((await getDraft(testPrisma, WEEK))?.days.every(d => d.protein === ids['Sea Bass'])).toBe(true)
    })

    it('readDays shows the draft for its week and the saved plan for other days', async () => {
      await savePlan(key(-7), { 6: { protein: ids['Beef Keema'] } })
      await createDraft(testPrisma, WEEK)
      await setMealSlot(testPrisma, createDraftStore(testPrisma, WEEK), { date: key(0), slot: 'protein', recipe_id: ids['Sea Bass'] })
      const days = await createDraftStore(testPrisma, WEEK).readDays(key(-1), key(0))
      expect(days.map(d => d.protein)).toEqual([ids['Beef Keema'], ids['Sea Bass']])
    })

    it("Ronen's tweaks are kept, and a changed day loses the agent's reason", async () => {
      await createDraft(testPrisma, WEEK)
      const store = createDraftStore(testPrisma, WEEK)
      await setMealSlot(testPrisma, store, { date: key(0), slot: 'protein', recipe_id: ids['Sea Bass'], reason: 'Fish, quick' })
      await setMealSlot(testPrisma, store, { date: key(1), slot: 'protein', recipe_id: ids['Chicken Schnitzel'], reason: 'Not had it for 3 weeks' })

      const days = (await getDraft(testPrisma, WEEK))!.days.map(d => ({ ...d }))
      days[0].protein = ids['Burgers'] // Ronen swaps Monday
      await saveDraftEdits(testPrisma, WEEK, days)

      const after = (await getDraft(testPrisma, WEEK))!.days
      expect(after[0]).toMatchObject({ protein: ids['Burgers'], reason: null })
      expect(after[1]).toMatchObject({ protein: ids['Chicken Schnitzel'], reason: 'Not had it for 3 weeks' })
    })

    it('accept writes the draft to the plan, marks the list stale and deletes the draft; discard deletes it only', async () => {
      await testPrisma.shoppingList.create({ data: { weekStart: parseDateParam(WEEK), stale: false } })
      await savePlan(WEEK, { 0: { protein: ids['Burgers'] } })
      await createDraft(testPrisma, WEEK)
      await setMealSlot(testPrisma, createDraftStore(testPrisma, WEEK), { date: key(2), slot: 'protein', recipe_id: ids['Sea Bass'] })

      expect(await acceptDraft(testPrisma, WEEK)).toBe(true)
      const plan = await testPrisma.mealPlan.findMany({ orderBy: { date: 'asc' } })
      expect(plan).toHaveLength(7)
      expect(plan[0].proteinRecipeId).toBe(ids['Burgers'])
      expect(plan[2].proteinRecipeId).toBe(ids['Sea Bass'])
      expect(await getDraft(testPrisma, WEEK)).toBeNull()
      expect((await testPrisma.shoppingList.findFirst())?.stale).toBe(true)
      expect(await acceptDraft(testPrisma, WEEK)).toBe(false)

      await createDraft(testPrisma, WEEK)
      await discardDraft(testPrisma, WEEK)
      expect(await getDraft(testPrisma, WEEK)).toBeNull()
      expect(await testPrisma.mealPlan.count()).toBe(7)
    })

    it('Next week list shows the meals of an accepted draft', async () => {
      // purchase history with an item that matches the recipe's ingredient
      const dates = Array.from({ length: 6 }, (_, i) => key(-7 * (i + 1), '2026-10-13'))
      for (const [i, date] of dates.entries()) {
        await testPrisma.purchaseHistory.create({ data: { rawName: 'Sea Bass Fillets', purchaseDate: new Date(`${date}T00:00:00.000Z`), source: 'receipt_upload', orderNumber: `70000${i}`, lineIndex: 0 } })
        await testPrisma.purchaseHistory.create({ data: { rawName: 'Milk', purchaseDate: new Date(`${date}T00:00:00.000Z`), source: 'receipt_upload', orderNumber: `70000${i}`, lineIndex: 1 } })
      }
      await testPrisma.ingredient.create({ data: { recipeId: ids['Sea Bass'], name: 'sea bass fillets', order: 0 } })

      await createDraft(testPrisma, WEEK)
      await setMealSlot(testPrisma, createDraftStore(testPrisma, WEEK), { date: key(2), slot: 'protein', recipe_id: ids['Sea Bass'] })
      const before = await loadNextWeek(testPrisma, parseDateParam(WEEK), parseDateParam(TODAY))
      expect(before.list.meals).toHaveLength(0) // a draft is not the plan

      await acceptDraft(testPrisma, WEEK)
      const after = await loadNextWeek(testPrisma, parseDateParam(WEEK), parseDateParam(TODAY))
      expect(after.list.meals.map(m => m.name)).toEqual(['Sea Bass'])
      expect(after.list.meals[0].lines[0]).toMatchObject({ label: 'Sea Bass Fillets' })
    })
  })

  describe('the agent on the SDK tool runner (scripted responses)', () => {
    it('draft: reads, searches, sets slots in parallel (a locked slot is refused), logs every step, and summarises', async () => {
      await savePlan(WEEK, { 3: { protein: ids['Burgers'] } })
      await createDraft(testPrisma, WEEK)
      const { client, requests } = scriptedClaude(req => {
        if (req.turn === 0) {
          return [
            { type: 'tool_use', id: 't1', name: 'read_plan', input: { from: key(-14), to: key(6) } },
            { type: 'tool_use', id: 't2', name: 'read_day_notes', input: { from: WEEK, to: key(6) } },
            { type: 'tool_use', id: 't3', name: 'search_recipes', input: { slot: 'protein', notOnPlanInLastDays: 14 } },
          ]
        }
        if (req.turn === 1) {
          return [
            { type: 'tool_use', id: 't4', name: 'set_meal_slot', input: { date: key(0), slot: 'protein', recipe_id: ids['Sea Bass'], reason: 'Fish, quick' } },
            { type: 'tool_use', id: 't5', name: 'set_meal_slot', input: { date: key(0), slot: 'carb', recipe_id: ids['Fries'] } },
            { type: 'tool_use', id: 't6', name: 'set_meal_slot', input: { date: key(3), slot: 'protein', recipe_id: ids['Sea Bass'] } }, // locked
          ]
        }
        return [{ type: 'text', text: 'Fish on Monday, Thursday kept as you chose it.' }]
      })

      const result = await runPlanAgent({ mode: 'draft', prisma: testPrisma, store: createDraftStore(testPrisma, WEEK), today: TODAY, weekStart: WEEK, client })

      expect(result.ok).toBe(true)
      expect(result.message).toBe('Fish on Monday, Thursday kept as you chose it.')
      expect(result.changes.map(c => `${c.date}:${c.slot}`).sort()).toEqual([`${key(0)}:carb`, `${key(0)}:protein`])

      const draft = await getDraft(testPrisma, WEEK)
      expect(draft?.days[0]).toMatchObject({ protein: ids['Sea Bass'], carb: ids['Fries'], reason: 'Fish, quick' })
      expect(draft?.days[3].protein).toBe(ids['Burgers']) // kept

      // The model was shown the four tools, the cached system prompt, and the results of its first turn
      expect(requests[0].tools.map(t => t.name).sort()).toEqual(['read_day_notes', 'read_plan', 'search_recipes', 'set_meal_slot'])
      expect(toolResultsIn(requests[1])).toHaveLength(3)
      const refused = toolResultsIn(requests[2]).find(r => (r as { ok?: boolean }).ok === false) as { error: string }
      expect(refused.error).toContain('already chose')

      // Every model turn, tool call and tool result is on the run log
      const run = await testPrisma.agentRun.findUniqueOrThrow({ where: { id: result.runId }, include: { steps: { orderBy: { order: 'asc' } } } })
      expect(run).toMatchObject({ agent: 'meal-plan', status: 'succeeded' })
      expect(run.steps.filter(s => s.kind === 'model')).toHaveLength(3)
      expect(run.steps.filter(s => s.kind === 'tool_call')).toHaveLength(6)
      expect(run.steps.filter(s => s.kind === 'tool_result')).toHaveLength(6)
      expect(run.inputTokens).toBe(300)
    })

    it('ask: changes one slot on the saved plan and reports it', async () => {
      await savePlan(WEEK, { 2: { protein: ids['Chicken Schnitzel'] } })
      const { client } = scriptedClaude(req =>
        req.turn === 0
          ? [{ type: 'tool_use', id: 't1', name: 'set_meal_slot', input: { date: key(2), slot: 'protein', recipe_id: ids['Sea Bass'] } }]
          : [{ type: 'text', text: "Swapped Wednesday's chicken for Sea Bass: fish, and quick." }]
      )
      const result = await runPlanAgent({ mode: 'ask', instruction: 'swap Wednesday for fish', prisma: testPrisma, store: createPlanStore(testPrisma), today: TODAY, weekStart: WEEK, client })
      expect(result).toMatchObject({ ok: true, message: "Swapped Wednesday's chicken for Sea Bass: fish, and quick." })
      expect(result.changes).toEqual([{ date: key(2), day: 'Wednesday', slot: 'protein', was: ids['Chicken Schnitzel'], now: ids['Sea Bass'] }])
      expect((await testPrisma.mealPlan.findFirst({ where: { date: parseDateParam(key(2)) } }))?.proteinRecipeId).toBe(ids['Sea Bass'])
    })

    it('ask with a pending draft changes the draft, not the saved plan', async () => {
      await savePlan(WEEK, {})
      await createDraft(testPrisma, WEEK)
      const { client } = scriptedClaude(req =>
        req.turn === 0
          ? [{ type: 'tool_use', id: 't1', name: 'set_meal_slot', input: { date: key(4), slot: 'protein', recipe_id: ids['Sea Bass'] } }]
          : [{ type: 'text', text: 'Done.' }]
      )
      await runPlanAgent({ mode: 'ask', instruction: 'fish on Friday', prisma: testPrisma, store: createDraftStore(testPrisma, WEEK), today: TODAY, weekStart: WEEK, client })
      expect((await getDraft(testPrisma, WEEK))?.days[4].protein).toBe(ids['Sea Bass'])
      expect((await testPrisma.mealPlan.findFirst({ where: { date: parseDateParam(key(4)) } }))?.proteinRecipeId).toBeNull()
    })

    it('a tool error is shown to the model, which can recover; a run that never finishes is failed', async () => {
      const { client } = scriptedClaude(req =>
        req.turn === 0
          ? [{ type: 'tool_use', id: 't1', name: 'set_meal_slot', input: { date: key(0), slot: 'protein', recipe_id: 'made-up-id' } }]
          : [{ type: 'text', text: 'Could not find a recipe.' }]
      )
      const ok = await runPlanAgent({ mode: 'ask', instruction: 'x', prisma: testPrisma, store: createPlanStore(testPrisma), today: TODAY, weekStart: WEEK, client })
      expect(ok).toMatchObject({ ok: true, changes: [] })

      const endless = scriptedClaude(() => [{ type: 'tool_use', id: `t${Math.random()}`, name: 'read_day_notes', input: { from: WEEK, to: WEEK } }])
      const failed = await runPlanAgent({ mode: 'ask', instruction: 'x', prisma: testPrisma, store: createPlanStore(testPrisma), today: TODAY, weekStart: WEEK, client: endless.client })
      expect(failed).toMatchObject({ ok: false, error: expect.stringContaining('ran out of steps') })
      expect((await testPrisma.agentRun.findUniqueOrThrow({ where: { id: failed.runId } })).status).toBe('failed')
    })
  })
})
