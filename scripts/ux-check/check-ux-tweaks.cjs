/**
 * UX tweaks check (Playwright, against `npm run build && npm start` and a local database)
 *
 *   NODE_PATH=/opt/node-tools/node_modules node scripts/ux-check/check-ux-tweaks.cjs <recipeIdWithSteps> [baseUrl] [screenshotDir]
 *
 * Needs a meal plan for this week and next week with some empty days in next week, and a recipe with steps
 * (the first argument) that has a source URL. With the model stand-in running (scripts/meal-plan/mock-anthropic.cjs,
 * ANTHROPIC_BASE_URL pointing at it, WITH_AGENT=1) it also tries the Ask box and Draft my week. Phone (390px, touch) and desktop (1280px).
 */

const { chromium } = require('playwright-core')
const fs = require('fs')

const [, , recipeId, baseUrl = 'http://localhost:3000', shotDir] = process.argv
const chromiumPath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
let failures = 0

function check(isOk, label) {
  console.log(`${isOk ? 'PASS' : 'FAIL'}  ${label}`)
  if (!isOk) failures += 1
}

async function pickRecipe(page, label, searchText) {
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel(label).click()
  await dialog.getByLabel(label).fill(searchText)
  await page.locator('[id*="-listbox"]').getByRole('option').first().click()
}

async function weekFlow(page, width) {
  await page.goto(`${baseUrl}/meal-plan`, { waitUntil: 'networkidle' })
  await page.getByTestId('week-list').waitFor()
  check((await page.locator('[aria-label^="Change "]').count()) === 0, 'No swap-arrows button on the Week page')
  check((await page.getByRole('button', { name: /^Edit / }).count()) === 7, 'Every day has an Edit button')
  if (shotDir && width < 768) await page.screenshot({ path: `${shotDir}/week-after-phone.png`, fullPage: true })

  // Next week has empty days: add a meal and a note without any swap button
  await page.getByRole('button', { name: 'Next week' }).click()
  await page.getByTestId('week-list').waitFor()
  await page.waitForTimeout(500)
  const emptyRow = page.locator('[data-testid=week-day-row]', { hasText: 'Plan this day' }).first()
  check((await emptyRow.count()) === 1, 'An empty day says "Plan this day"')
  const day = await emptyRow.getAttribute('data-day')
  await emptyRow.getByText('Plan this day').click()
  const dialog = page.getByRole('dialog', { name: `Edit ${day}` })
  await dialog.waitFor()
  check(await dialog.getByText('Swap with another day').isVisible(), 'The editor keeps "Swap with another day", in words')
  if (shotDir && width < 768) await page.screenshot({ path: `${shotDir}/editor-phone.png` })
  await pickRecipe(page, `Protein for ${day}`, 'Bulk recipe 7')
  await page.getByRole('button', { name: 'Done' }).click()
  const note = `bring snacks ${width}`
  await page.getByLabel(`Note for ${day}`).fill(note)
  await page.getByRole('button', { name: 'Save plan' }).click()
  await page.waitForTimeout(1500)
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByTestId('week-list').waitFor()
  const rowText = await page.locator(`[data-day="${day}"]`).innerText()
  check(rowText.includes('Bulk recipe 7'), 'The meal added through the editor is saved')
  check((await page.getByLabel(`Note for ${day}`).inputValue()) === note, 'The note typed in the row is saved, no panel needed')

  // The hint, from this week, while next week still has empty days
  await page.getByRole('button', { name: 'Previous week' }).click()
  await page.getByTestId('week-list').waitFor()
  await page.getByTestId('draft-notes-hint').waitFor({ timeout: 10000 }).catch(() => {})
  check(await page.getByTestId('draft-notes-hint').isVisible(), 'Hint "Add notes first, Draft my week uses them" shows near Draft my week')

  check(await page.getByRole('button', { name: 'Draft my week' }).isVisible(), 'Draft my week is still there')
  check(await page.getByRole('textbox', { name: 'Ask for a change' }).isVisible(), 'The Ask box is still there')
  check(await page.getByRole('button', { name: 'Save plan' }).isVisible(), 'Save plan is still there')
  // swap with another day still works from the editor
  const before = await page.locator('[data-testid=week-day-row]').nth(0).innerText()
  await page.getByRole('button', { name: /^Edit / }).nth(0).click()
  await page.getByLabel('Swap with day').selectOption({ index: 1 })
  await page.getByRole('button', { name: 'Swap', exact: true }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  check(before !== (await page.locator('[data-testid=week-day-row]').nth(0).innerText()), 'Swap with another day still works')

  if (process.env.WITH_AGENT) {
    await page.getByRole('textbox', { name: 'Ask for a change' }).fill('swap Wednesday for fish')
    await page.getByRole('button', { name: 'Ask', exact: true }).click()
    await page.waitForSelector('[data-testid=ask-result]', { timeout: 90000 })
    check(true, 'Ask box answers')
    await page.getByRole('button', { name: 'Next week' }).click()
    await page.getByRole('button', { name: 'Draft my week' }).click()
    await page.waitForSelector('[data-testid=draft-banner]', { timeout: 90000 })
    check(true, 'Draft my week produces a draft with Accept all')
    await page.getByRole('button', { name: 'Accept all' }).click()
    await page.waitForSelector('[data-testid=draft-banner]', { state: 'detached', timeout: 30000 })
    check(true, 'Accept all works')
  }
}

async function cookFlow(page) {
  await page.goto(`${baseUrl}/recipes/${recipeId}/cook`, { waitUntil: 'networkidle' })
  await page.getByTestId('cook-screen').waitFor()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Start timer' }).click()
  await page.waitForTimeout(1200)
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByTestId('cook-screen').waitFor()
  await page.waitForTimeout(500)
  check(/step 2/i.test(await page.getByTestId('step-counter').innerText()), 'Cook mode resumes on the same step after a reload')
  check((await page.getByTestId('active-timer').getAttribute('data-status')) === 'running', 'A running timer survives the reload')

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await page.getByTestId('resume-cooking').waitFor()
  check(true, 'Tonight shows Resume cooking while a session is in progress')
  await page.getByTestId('resume-cooking').click()
  await page.getByTestId('cook-screen').waitFor()
  await page.waitForTimeout(500)
  check(/step 2/i.test(await page.getByTestId('step-counter').innerText()), 'Resume cooking goes back to the step')
  await page.getByRole('link', { name: 'Leave cook mode' }).click()
  await page.waitForURL(`**/recipes/${recipeId}`)
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
  check((await page.getByTestId('resume-cooking').count()) === 0, 'Leaving cook mode on purpose clears it')
}

async function installFlow(context, page) {
  const manifestResponse = await page.request.get(`${baseUrl}/manifest.webmanifest`)
  const manifest = await manifestResponse.json()
  check(manifestResponse.ok() && manifest.display === 'standalone' && manifest.start_url === '/', 'Manifest is served: standalone, start at /')
  check(Boolean(manifest.name && manifest.short_name && manifest.theme_color && manifest.background_color), 'Manifest has names and colours')
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  for (const icon of manifest.icons) {
    const size = await page.evaluate(
      (src) => new Promise((resolve) => { const img = new Image(); img.onload = () => resolve([img.naturalWidth, img.naturalHeight]); img.onerror = () => resolve(null); img.src = src }),
      icon.src
    )
    check(JSON.stringify(size) === JSON.stringify(icon.sizes.split('x').map(Number)), `Icon ${icon.src} loads at ${icon.sizes} (${icon.purpose})`)
  }
  check(manifest.icons.some((icon) => icon.purpose === 'maskable'), 'A maskable icon is provided')
  const apple = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')
  const appleSize = await page.evaluate((src) => new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img.naturalWidth); img.onerror = () => resolve(null); img.src = src }), apple)
  check(appleSize === 180, 'iPhone home-screen icon (180px) loads')
  check((await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content')) === 'yes', 'iPhone full-screen tag is present')
  check((await page.locator('meta[name="apple-mobile-web-app-title"]').count()) === 1, 'iPhone app title is set')
  check((await page.locator('link[rel="manifest"]').count()) === 1, 'Page links the manifest')

  // Standalone: no browser back button. Walk the app by its own controls only.
  const standalone = await context.newPage()
  // (Headless Chromium cannot switch to display-mode: standalone; the real home-screen app is tried on a phone.
  // What this walk proves is that nothing needs a browser back button or address bar.)
  await standalone.goto(`${baseUrl}/`, { waitUntil: 'networkidle' })
  const nav = standalone.getByRole('navigation', { name: 'Main' })
  await nav.getByRole('link', { name: 'Recipes', exact: true }).last().click()
  await standalone.waitForURL('**/recipes')
  await standalone.locator(`a[href="/recipes/${recipeId}"]`).first().click().catch(async () => standalone.goto(`${baseUrl}/recipes/${recipeId}`))
  await standalone.waitForURL(`**/recipes/${recipeId}`)
  await standalone.getByRole('link', { name: 'Back to recipes' }).click()
  await standalone.waitForURL('**/recipes')
  check(true, 'Recipes -> recipe -> Back to recipes works without a browser back button')
  await nav.getByRole('link', { name: 'Week', exact: true }).last().click()
  await standalone.waitForURL('**/meal-plan')
  await standalone.getByRole('link', { name: /settings/i }).first().click()
  await standalone.waitForURL('**/settings')
  await standalone.getByRole('link', { name: /Timings/ }).click()
  await standalone.waitForURL('**/admin/timings')
  check(await nav.getByRole('link', { name: 'Tonight', exact: true }).last().isVisible(), 'Admin pages keep the tab bar, no dead ends')
  await nav.getByRole('link', { name: 'Tonight', exact: true }).last().click()
  await standalone.waitForURL(`${baseUrl}/`)
  check(true, 'Settings -> Timings -> Tonight by the app\'s own controls')

  // Links to recipe websites still open
  await standalone.goto(`${baseUrl}/recipes/${recipeId}`, { waitUntil: 'networkidle' })
  const link = standalone.locator('a[target="_blank"]').first()
  const rel = await link.getAttribute('rel')
  const popupPromise = context.waitForEvent('page', { timeout: 8000 }).catch(() => null)
  await link.click()
  const popup = await popupPromise
  check(Boolean(popup) && /noopener/.test(rel || ''), 'A recipe website link opens (in its own tab, app stays put)')
  if (popup) await popup.close()
  await standalone.close()
}

async function run(browser, { name, width, height, isTouch }) {
  console.log(`\n== ${name} (${width}px) ==`)
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: isTouch, isMobile: isTouch })
  const page = await context.newPage()
  page.on('dialog', (dialog) => dialog.accept())
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await weekFlow(page, width)
  await cookFlow(page)
  if (width < 768) await installFlow(context, page)
  check(errors.length === 0, `No page errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
  await context.close()
}

;(async () => {
  if (shotDir) fs.mkdirSync(shotDir, { recursive: true })
  const browser = await chromium.launch({ executablePath: chromiumPath })
  // ONLY=phone or ONLY=desktop runs one width (the check fills next week's empty days, so reseed between runs)
  if (process.env.ONLY !== 'desktop') await run(browser, { name: 'phone', width: 390, height: 844, isTouch: true })
  if (process.env.ONLY !== 'phone') await run(browser, { name: 'desktop', width: 1280, height: 800, isTouch: false })
  await browser.close()
  console.log(failures === 0 ? '\nAll checks passed' : `\n${failures} check(s) failed`)
  process.exit(failures === 0 ? 0 : 1)
})()
