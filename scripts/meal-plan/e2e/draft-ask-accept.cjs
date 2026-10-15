// Playwright check of Draft my week / reasons / change a day / Accept all / Ask box / Next week.
// Run against `npm run build && npm start` with scripts/meal-plan/mock-anthropic.cjs (see that file) and seed-demo.ts data.
// Usage: BASE=http://localhost:3100 node scripts/meal-plan/e2e/draft-ask-accept.cjs
const { chromium } = require('playwright')
const BASE = process.env.BASE || 'http://localhost:3100'
const OUT = 'docs/rehaul/logs/phase3-screens'
;(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
  for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport, hasTouch: label === 'phone' })
    const page = await ctx.newPage()
    page.on('pageerror', e => console.log(label, 'PAGEERROR', e.message))
    page.on('dialog', d => d.accept())
    await page.goto(`${BASE}/meal-plan`)
    await page.waitForSelector('[data-testid=week-list]')
    console.log(label, 'toolbar has Draft my week:', await page.getByRole('button', { name: 'Draft my week' }).isVisible(), '| old AI button gone:', (await page.getByRole('button', { name: /Generate with AI/ }).count()) === 0)

    await page.getByRole('button', { name: 'Draft my week' }).click()
    await page.waitForSelector('[data-testid=draft-banner]', { timeout: 90000 })
    console.log(label, 'banner:', (await page.innerText('[data-testid=draft-banner]')).replace(/\n+/g, ' | '))
    const reasons = await page.locator('[data-testid=day-reason]').allInnerTexts()
    console.log(label, 'reasons shown:', reasons.length, JSON.stringify(reasons.slice(0, 2)))
    const rows = await page.locator('[data-testid=week-day-row]').allInnerTexts()
    console.log(label, 'Fri (filled, kept):', rows[4].split('\n').slice(0, 3).join(' / '))
    console.log(label, 'Thu (note says out):', rows[3].split('\n').slice(0, 3).join(' / '))
    await page.screenshot({ path: `${OUT}/${label}-draft.png`, fullPage: true })

    // reload: the draft is still there (stored, not just on screen)
    await page.reload(); await page.waitForSelector('[data-testid=draft-banner]')
    console.log(label, 'draft survives reload:', true)

    // change a day before accepting: swap Thursday (empty, "out") with Monday's dinner
    const mon = (await page.locator('[data-testid=week-day-row]').nth(0).innerText()).split('\n')[2]
    await page.getByRole('button', { name: 'Change Thursday' }).click()
    await page.getByLabel('Swap with day').selectOption('0')
    await page.getByRole('button', { name: 'Swap', exact: true }).click()
    await page.getByRole('button', { name: 'Done' }).click()
    await page.waitForTimeout(1500) // tweaks are kept in the draft a moment after
    await page.reload(); await page.waitForSelector('[data-testid=draft-banner]')
    const rows2 = await page.locator('[data-testid=week-day-row]').allInnerTexts()
    console.log(label, 'Monday was', mon, '-> Monday now:', rows2[0].split('\n').slice(2, 3).join(''), '| Thursday now:', rows2[3].split('\n').slice(2, 4).join(' / '))

    // Ask box on the draft
    await page.getByRole('textbox', { name: 'Ask for a change' }).fill('swap Wednesday for fish')
    await page.getByRole('button', { name: 'Ask', exact: true }).click()
    await page.waitForSelector('[data-testid=ask-result]', { timeout: 90000 })
    console.log(label, 'ask result:', (await page.innerText('[data-testid=ask-result]')).replace(/\n+/g, ' | '))
    console.log(label, 'Wednesday now:', (await page.locator('[data-testid=week-day-row]').nth(2).innerText()).split('\n').slice(0, 3).join(' / '))
    await page.screenshot({ path: `${OUT}/${label}-after-ask.png`, fullPage: true })

    // Accept all
    await page.getByRole('button', { name: 'Accept all' }).click()
    await page.waitForSelector('[data-testid=draft-banner]', { state: 'detached', timeout: 30000 })
    await page.reload(); await page.waitForSelector('[data-testid=week-list]')
    console.log(label, 'accepted: no banner after reload:', (await page.locator('[data-testid=draft-banner]').count()) === 0, '| Wednesday saved:', (await page.locator('[data-testid=week-day-row]').nth(2).innerText()).split('\n')[2])

    // Next week shopping list shows the meals
    await page.goto(`${BASE}/shopping-list`)
    await page.waitForSelector("text=Next week's list")
    const cards = await page.locator('section[aria-label="For this week\'s meals"] p.font-display').allInnerTexts()
    console.log(label, 'Next week meal cards:', cards.length, JSON.stringify(cards.slice(0, 3)))
    await page.screenshot({ path: `${OUT}/${label}-next-week.png`, fullPage: true })
    console.log(label, 'horizontal overflow:', await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth))
    await ctx.close()
    // reset for the second viewport
    if (label === 'desktop') await require('child_process').execSync(`psql "$DATABASE_URL" -q -c "delete from \\"PlanDraft\\"" -c "update \\"MealPlan\\" set \\"proteinRecipeId\\"=null,\\"carbRecipeId\\"=null,\\"vegetableRecipeId\\"=null where date >= '2026-10-19'" -c "update \\"MealPlan\\" set \\"proteinRecipeId\\"=(select id from \\"Recipe\\" where name='Burgers') where date='2026-10-23'"`, { env: process.env })
  }
  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
