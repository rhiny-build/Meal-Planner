/**
 * Page timing run (Playwright, against `npm run build && npm start`, never `npm run dev`)
 *
 *   NODE_PATH=$(npm root -g) node scripts/timing-check/measure-pages.cjs <recipeId> [baseUrl] [rounds]
 *
 * Opens each main page `rounds` times at phone width (a full load, like opening the app), then taps
 * through the tab bar (moving between pages inside the app). The app's own timing records
 * (RequestTiming, shown on /admin/timings) are what you read afterwards; this script only generates
 * the visits and prints what the browser saw for each full load.
 */

const { chromium } = require('playwright-core')

const [, , recipeId, baseUrl = 'http://localhost:3000', rounds = '12'] = process.argv
const chromiumPath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

// Page, and something that only shows once the real content (not "Loading...") is on screen
const PAGES = [
  ['/', '[data-testid="tonight-dinner"], [data-testid="tonight-empty"]'],
  ['/meal-plan', '[data-testid="week-list"]'],
  ['/recipes', '[data-testid="recipe-card"], article'],
  [`/recipes/${recipeId}`, '[data-testid="recipe-title"]'],
  ['/shopping-list', 'main h1, main h2'],
  ['/settings', 'main h1, main h2'],
]

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

;(async () => {
  const browser = await chromium.launch({ executablePath: chromiumPath })
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
  const page = await context.newPage()
  console.log('Full loads (ms until the real content is on screen, as the browser saw it)')
  for (const [path, ready] of PAGES) {
    const times = []
    for (let i = 0; i < Number(rounds); i++) {
      const startedAt = Date.now()
      await page.goto(baseUrl + path)
      await page.waitForSelector(ready, { timeout: 30000 })
      times.push(Date.now() - startedAt)
    }
    console.log(`${path.padEnd(32)} median ${median(times)}  slowest ${Math.max(...times)}  (${times.length} loads)`)
  }
  console.log('Tapping through the tab bar')
  await page.goto(baseUrl + '/')
  for (let i = 0; i < Number(rounds); i++) {
    for (const label of ['Recipes', 'Week', 'Shopping', 'Tonight']) {
      await page.getByRole('link', { name: label, exact: true }).last().click()
      await page.waitForTimeout(700)
    }
  }
  await page.waitForTimeout(1500) // let the last reports go out
  await browser.close()
})()
