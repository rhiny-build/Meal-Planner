// Playwright check against a running dev server (npm run dev, local Postgres, dev Claude key). Run: node scripts/next-week/e2e/4-rebuild.cjs
// Needs RECEIPTS_ZIP (synthetic zip, see scripts/next-week/make-synthetic-zip.ts) for step 1. Screenshots go to docs/rehaul/logs/next-week-screens/.
const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage()
  await page.goto('http://localhost:3000/admin/receipts')
  await page.getByRole('button', { name: 'Rebuild from stored receipts' }).click()
  await page.waitForSelector('[data-testid=receipt-report]', { timeout: 120000 })
  console.log((await page.innerText('[data-testid=receipt-report]')).replace(/\n+/g, ' | ').slice(0, 260))
  await browser.close()
})()
