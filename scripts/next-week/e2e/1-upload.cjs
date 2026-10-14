// Playwright check against a running dev server (npm run dev, local Postgres, dev Claude key). Run: node scripts/next-week/e2e/1-upload.cjs
// Needs RECEIPTS_ZIP (synthetic zip, see scripts/next-week/make-synthetic-zip.ts) for step 1. Screenshots go to docs/rehaul/logs/next-week-screens/.
const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await ctx.newPage()
  page.on('pageerror', e => console.log('PAGEERROR', e.message))
  await page.goto('http://localhost:3000/admin/receipts')
  await page.screenshot({ path: 'docs/rehaul/logs/next-week-screens/admin-before.png' })
  await page.setInputFiles('[data-testid=receipt-files]', ''+process.env.RECEIPTS_ZIP+'')
  await page.waitForSelector('[data-testid=receipt-report]', { timeout: 240000 })
  console.log((await page.innerText('[data-testid=receipt-report]')).replace(/\n+/g, ' | '))
  await page.screenshot({ path: 'docs/rehaul/logs/next-week-screens/admin-report.png', fullPage: true })
  // upload again: nothing duplicated
  await page.setInputFiles('[data-testid=receipt-files]', ''+process.env.RECEIPTS_ZIP+'')
  await page.waitForSelector('[data-testid=receipt-report]:has-text("already stored")', { timeout: 240000 })
  console.log('2nd:', (await page.innerText('[data-testid=receipt-report]')).replace(/\n+/g, ' | ').slice(0, 300))
  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
