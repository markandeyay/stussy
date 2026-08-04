import { chromium } from 'playwright'
import fs from 'node:fs'

/* Playwright QA loop: full page + section shots + console errors.
   Usage: node qa/shot.mjs [url] [outdir] */

const URL = process.argv[2] || 'http://localhost:5173/'
const OUT = process.argv[3] || '/tmp/stussy_qa'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const errors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text())
})
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(2600) // loader exit

// scroll through the page to trigger IO reveals + lazy images
await page.evaluate(async () => {
  const h = document.body.scrollHeight
  for (let y = 0; y <= h; y += 700) {
    window.scrollTo(0, y)
    await new Promise((r) => setTimeout(r, 60))
  }
  window.scrollTo(0, 0)
})
await page.waitForTimeout(1200)

const sections = ['#hero', '#story', '#lookbook', '#drop', '#tribe', '#store', '.p-footer']
for (const sel of sections) {
  const el = page.locator(sel)
  if (await el.count()) {
    await el.scrollIntoViewIfNeeded()
    await page.waitForTimeout(900)
    await el.screenshot({ path: `${OUT}/${sel.replace(/[#.]/g, '')}.png` })
  }
}

await page.screenshot({ path: `${OUT}/full.png`, fullPage: true })

// marquee + hover state sample
const gyre = page.locator('[data-gyre] .c-gyre__inner').first()
if (await gyre.count()) {
  await gyre.scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  await gyre.hover()
  await page.waitForTimeout(1100)
  await page.screenshot({ path: `${OUT}/hover_gyre.png` })
}

console.log('CONSOLE ERRORS:', errors.length ? JSON.stringify(errors, null, 2) : 'none')
await browser.close()
console.log('DONE ->', OUT)
