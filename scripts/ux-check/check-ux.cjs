/**
 * UX refresh check (Playwright, run by hand against a local dev server)
 *
 *   node scripts/ux-check/check-ux.cjs <recipeIdWithSteps> [baseUrl]
 *
 * Needs `playwright-core` and a Chromium (set CHROMIUM_PATH). The database must have a meal plan
 * for this week with a recipe that has ingredients, servings and a method planned for today
 * (the recipe id is the first argument). Runs the same flow at phone width (390px, touch) and
 * desktop width (1280px) and exits non-zero if anything is off.
 */

const { chromium } = require('playwright-core')

const [, , recipeId, baseUrl = 'http://localhost:3000'] = process.argv
const chromiumPath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
let failures = 0

function check(isOk, label) {
  console.log(`${isOk ? 'PASS' : 'FAIL'}  ${label}`)
  if (!isOk) failures += 1
}

async function swipe(page, from, to) {
  const client = await page.context().newCDPSession(page)
  const point = (x) => [{ x, y: 400 }]
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from) })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point((from + to) / 2) })
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(to) })
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

async function run(browser, { name, width, height, isTouch }) {
  console.log(`\n== ${name} (${width}px) ==`)
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: isTouch, isMobile: isTouch })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))

  // Tonight
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await page.getByTestId('tonight-main').waitFor()
  const mainName = await page.getByTestId('tonight-main').innerText()
  check(mainName.length > 0, `Tonight shows today's dinner (${mainName})`)
  check(await page.getByTestId('tonight-note').count() === 1, "Tonight shows today's note")
  check(await page.getByTestId('rest-of-week').locator('li').count() > 0, 'Tonight lists the rest of the week')

  // Start cooking -> cook mode
  await page.getByRole('link', { name: 'Start cooking' }).click()
  await page.getByTestId('cook-screen').waitFor()
  check(page.url().endsWith('/cook'), 'Start cooking opens cook mode')
  check((await page.getByTestId('step-counter').innerText()).toLowerCase().includes('step 1'), 'Cook mode starts at step 1')

  // Recipe pages flip
  await page.goto(`${baseUrl}/recipes/${recipeId}`, { waitUntil: 'networkidle' })
  check(await page.getByTestId('recipe-overview').isVisible(), 'Recipe opens on Overview')
  await page.getByRole('tab', { name: 'Ingredients' }).click()
  check(await page.getByTestId('recipe-ingredients').isVisible(), 'Ingredients tab shows ingredients')
  const before = await page.getByTestId('cook-ingredient-list').innerText()
  const servingsBefore = Number(await page.getByTestId('servings-value').innerText())
  await page.getByRole('button', { name: 'More servings' }).click()
  await page.getByRole('button', { name: 'More servings' }).click()
  const after = await page.getByTestId('cook-ingredient-list').innerText()
  check(Number(await page.getByTestId('servings-value').innerText()) === servingsBefore + 2, 'Servings control changes the number')
  check(before !== after, 'Ingredient amounts rescale with servings')

  await page.getByRole('button', { name: 'Start cooking' }).click()
  await page.getByTestId('step-counter').waitFor()
  check((await page.getByTestId('step-counter').innerText()).toLowerCase().includes('step 1'), 'Method page shows step 1 (cook mode embedded)')
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  check((await page.getByTestId('step-counter').innerText()).toLowerCase().includes('step 2'), 'Next moves to step 2')
  await page.getByRole('tab', { name: 'Overview' }).click()
  check(await page.getByTestId('recipe-overview').isVisible(), 'Tabs flip back to Overview')

  if (isTouch) {
    await swipe(page, 300, 60)
    await page.waitForTimeout(300)
    check(await page.getByTestId('recipe-ingredients').isVisible(), 'Swipe left moves Overview -> Ingredients')
    await swipe(page, 60, 300)
    await page.waitForTimeout(300)
    check(await page.getByTestId('recipe-overview').isVisible(), 'Swipe right moves back to Overview')
  }

  // Swap from Tonight: clear today's main, save, see the empty state, then put it back
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await page.getByTestId('tonight-main').waitFor()
  await page.getByRole('link', { name: "Swap tonight's meal" }).click()
  await page.getByTestId('day-swap-sheet').waitFor()
  check(await page.getByTestId('day-swap-sheet').isVisible(), "Tonight's swap opens that day's change sheet")
  const dayLabel = await page.getByRole('dialog').getByRole('heading').innerText()
  await page.getByRole('dialog').getByLabel(`Protein for ${dayLabel}`).click()
  await page.locator('[id*="-listbox"]').getByRole('option').nth(1).click()
  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('button', { name: 'Save plan' }).click()
  await page.waitForTimeout(1200)
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await page.getByTestId('tonight-main').waitFor()
  const swappedMain = await page.getByTestId('tonight-main').innerText()
  check(swappedMain !== mainName, `Swap changes tonight's dinner (${mainName} -> ${swappedMain})`)

  // Put the original back through the same sheet
  await page.getByRole('link', { name: "Swap tonight's meal" }).click()
  await page.getByTestId('day-swap-sheet').waitFor()
  await page.getByRole('dialog').getByLabel(`Protein for ${dayLabel}`).click()
  await page.getByRole('dialog').getByLabel(`Protein for ${dayLabel}`).fill(mainName)
  await page.locator('[id*="-listbox"]').getByRole('option', { name: mainName }).first().click()
  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('button', { name: 'Save plan' }).click()
  await page.waitForTimeout(1200)
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await page.getByTestId('tonight-main').waitFor()
  check((await page.getByTestId('tonight-main').innerText()) === mainName, 'Original dinner restored')

  // Week list: tap a day for its ingredients, swap a day with another one (not saved)
  await page.goto(`${baseUrl}/meal-plan`, { waitUntil: 'networkidle' })
  await page.getByTestId('week-list').waitFor()
  check((await page.getByTestId('week-day-row').count()) === 7, 'Week page has one row per day')
  check(/\d+ of 21 meals planned/.test(await page.getByTestId('selected-count').innerText()), 'Week page shows how many meals are planned')
  await page.getByRole('button', { name: `Show ${dayLabel} details` }).click()
  check(await page.getByTestId('week-day-details').isVisible(), "Tapping a day shows that day's recipes and ingredients")
  const rowBefore = await page.locator(`[data-day="${dayLabel}"]`).innerText()
  await page.getByRole('button', { name: `Change ${dayLabel}` }).click()
  await page.getByLabel('Swap with day').selectOption({ index: 1 })
  await page.getByRole('button', { name: 'Swap', exact: true }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  const rowAfter = await page.locator(`[data-day="${dayLabel}"]`).innerText()
  check(rowBefore !== rowAfter, 'Swap with another day changes the day (left unsaved)')

  // Navigation
  if (width < 768) {
    check(await page.getByRole('navigation', { name: 'Main' }).locator('a').count() === 4, 'Phone tab bar has four tabs')
  } else {
    check(await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Settings' }).isVisible(), 'Desktop bar links to Settings')
  }

  check(errors.length === 0, `No page errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
  await context.close()
}

;(async () => {
  const browser = await chromium.launch({ executablePath: chromiumPath })
  await run(browser, { name: 'phone', width: 390, height: 844, isTouch: true })
  await run(browser, { name: 'desktop', width: 1280, height: 800, isTouch: false })
  await browser.close()
  console.log(failures === 0 ? '\nAll checks passed' : `\n${failures} check(s) failed`)
  process.exit(failures === 0 ? 0 : 1)
})()
