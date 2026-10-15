/**
 * Real-model check of the meal-plan agent against the LOCAL database (run seed-demo.ts first).
 *   ANTHROPIC_API_KEY=$DEV_ANTHROPIC_API_KEY npx tsx scripts/meal-plan/try-agent.ts draft
 *   ANTHROPIC_API_KEY=$DEV_ANTHROPIC_API_KEY npx tsx scripts/meal-plan/try-agent.ts ask "swap Wednesday for fish"
 * Prints what changed, the agent's sentence, the tokens used and how long it took.
 */
import { PrismaClient } from '@prisma/client'
import { formatDateParam } from '../../lib/dateUtils'
import { createDraft, getDraft } from '../../lib/mealPlanAgent/draft'
import { createDraftStore, createPlanStore } from '../../lib/mealPlanAgent/planStore'
import { getWeekStartDay } from '../../lib/mealPlanAgent/dates'
import { runPlanAgent } from '../../lib/mealPlanAgent/runPlanAgent'
import { nextWeekStart } from '../../lib/nextWeek/loadNextWeek'

const prisma = new PrismaClient()

async function main() {
  const [mode, instruction] = process.argv.slice(2)
  const now = new Date()
  const weekStart = formatDateParam(nextWeekStart(now, await getWeekStartDay(prisma)))
  const started = Date.now()
  const names = new Map((await prisma.recipe.findMany({ select: { id: true, name: true } })).map(r => [r.id, r.name]))
  const name = (id: string | null) => (id ? names.get(id) ?? id : '-')

  if (mode === 'draft') {
    await createDraft(prisma, weekStart)
    const result = await runPlanAgent({ mode: 'draft', prisma, store: createDraftStore(prisma, weekStart), today: formatDateParam(now), weekStart })
    console.log(JSON.stringify({ ok: result.ok, error: result.error, message: result.message, tokens: result.tokens, seconds: (Date.now() - started) / 1000, changes: result.changes.length }))
    for (const d of (await getDraft(prisma, weekStart))?.days ?? []) console.log(`${d.date} ${d.dayOfWeek.slice(0, 3)}  ${name(d.protein)} | ${name(d.carb)} | ${name(d.vegetable)}  -- ${d.reason ?? ''}`)
  } else {
    const hasDraft = (await getDraft(prisma, weekStart)) !== null
    const store = hasDraft ? createDraftStore(prisma, weekStart) : createPlanStore(prisma)
    const result = await runPlanAgent({ mode: 'ask', instruction, prisma, store, today: formatDateParam(now), weekStart })
    console.log(JSON.stringify({ ok: result.ok, error: result.error, message: result.message, tokens: result.tokens, seconds: (Date.now() - started) / 1000 }))
    for (const c of result.changes) console.log(`${c.date} ${c.slot}: ${name(c.was)} -> ${name(c.now)}`)
  }
}
main().finally(() => prisma.$disconnect())
