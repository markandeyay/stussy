import { chromium } from 'playwright'

/* v3 QA: fonts, hero, story split reveal, lookbook horizontal pin, tribe env swap */

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)
await page.screenshot({ path: '/tmp/stussy_qa/v3_hero.png' })

// story (split-word reveal)
await page.locator('#story').scrollIntoViewIfNeeded()
await page.waitForTimeout(1400)
await page.locator('#story').screenshot({ path: '/tmp/stussy_qa/v3_story.png' })

// lookbook pin: scroll to pin start, then mid-pin
await page.locator('#lookbook-pin').scrollIntoViewIfNeeded()
await page.waitForTimeout(800)
const pinTop = await page.evaluate(() => {
  const el = document.getElementById('lookbook-pin')
  return el.getBoundingClientRect().top + window.scrollY
})
await page.evaluate((y) => window.scrollTo(0, y + 10), pinTop)
await page.waitForTimeout(900)
await page.screenshot({ path: '/tmp/stussy_qa/v3_lb_start.png' })
await page.evaluate((y) => window.scrollTo(0, y + 1400), pinTop)
await page.waitForTimeout(900)
await page.screenshot({ path: '/tmp/stussy_qa/v3_lb_mid.png' })
await page.evaluate((y) => window.scrollTo(0, y + 2800), pinTop)
await page.waitForTimeout(900)
await page.screenshot({ path: '/tmp/stussy_qa/v3_lb_end.png' })

// tribe env swap hover
const card = page.locator('.tribe-card').nth(2)
await card.scrollIntoViewIfNeeded()
await page.waitForTimeout(800)
await card.hover()
await page.waitForTimeout(900)
await page.locator('#tribe').screenshot({ path: '/tmp/stussy_qa/v3_tribe.png' })

console.log('CONSOLE ERRORS:', errors.length ? JSON.stringify(errors, null, 2) : 'none')
await browser.close()
console.log('DONE')
