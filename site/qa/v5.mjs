import { chromium } from 'playwright'

/* v5 verification: stream density, drop images (eager), lookbook dist, story pin, store ram, footer */

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4200)
await page.screenshot({ path: '/tmp/stussy_qa/v5_hero.png' })

const yOf = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s)
  return el ? el.getBoundingClientRect().top + window.scrollY : 0
}, sel)

// lookbook end — verify last figure + end cap visible at pin end
const lbY = await yOf('#lookbook-pin')
const lbDist = await page.evaluate(() => {
  const t = document.getElementById('lookbook-track')
  return t.scrollWidth - window.innerWidth + 40
})
await page.evaluate((yy) => window.scrollTo(0, yy), lbY + lbDist - 200)
await page.waitForTimeout(2500)
await page.screenshot({ path: '/tmp/stussy_qa/v5_lb_end.png' })

// drop settled — images must be visible
const dropY = await yOf('#drop')
await page.evaluate((yy) => window.scrollTo(0, yy), dropY + 40)
await page.waitForTimeout(2600)
await page.screenshot({ path: '/tmp/stussy_qa/v5_drop.png' })

// store — bigger ram
const storeY = await yOf('#store')
await page.evaluate((yy) => window.scrollTo(0, yy), storeY + 100)
await page.waitForTimeout(2200)
await page.screenshot({ path: '/tmp/stussy_qa/v5_store.png' })

// story mid-pin — streams should be dense behind everything
const storyY = await yOf('#story-pin')
await page.evaluate((yy) => window.scrollTo(0, yy), storyY + 900)
await page.waitForTimeout(2200)
await page.screenshot({ path: '/tmp/stussy_qa/v5_story.png' })

// footer
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(2200)
await page.screenshot({ path: '/tmp/stussy_qa/v5_footer.png' })

console.log('CONSOLE ERRORS:', errors.length ? JSON.stringify(errors, null, 2) : 'none')
await browser.close()
console.log('DONE')
