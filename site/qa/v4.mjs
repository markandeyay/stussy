import { chromium } from 'playwright'

/* v4 QA: stream right-entry, story pin sequence, drop cascade, tribe fan, store slides, color */

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', (err) => errors.push(String(err)))

const yOf = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s)
  return el ? el.getBoundingClientRect().top + window.scrollY : 0
}, sel)

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3200)
await page.screenshot({ path: '/tmp/stussy_qa/v4_hero.png' })

// story: approach (pre-pin reveals) — put story-pin top at ~55% viewport
const storyY = await yOf('#story-pin')
await page.evaluate((y) => window.scrollTo(0, y - 500), storyY)
await page.waitForTimeout(1200)
await page.screenshot({ path: '/tmp/stussy_qa/v4_story_approach.png' })

// story pinned phases
await page.evaluate((y) => window.scrollTo(0, y + 250), storyY)
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/stussy_qa/v4_story_pin1.png' })
await page.evaluate((y) => window.scrollTo(0, y + 800), storyY)
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/stussy_qa/v4_story_pin2.png' })
await page.evaluate((y) => window.scrollTo(0, y + 1600), storyY)
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/stussy_qa/v4_story_pin3.png' })

// lookbook sanity (still pinned + progress)
const lbY = await yOf('#lookbook-pin')
await page.evaluate((y) => window.scrollTo(0, y + 1400), lbY)
await page.waitForTimeout(900)
await page.screenshot({ path: '/tmp/stussy_qa/v4_lb_mid.png' })

// drop: mid-cascade then settled
const dropY = await yOf('#drop')
await page.evaluate((y) => window.scrollTo(0, y - 350), dropY)
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/stussy_qa/v4_drop_mid.png' })
await page.evaluate((y) => window.scrollTo(0, y + 50), dropY)
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/stussy_qa/v4_drop_set.png' })

// tribe: mid-fan then settled
const tribeY = await yOf('#tribe')
await page.evaluate((y) => window.scrollTo(0, y - 400), tribeY)
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/stussy_qa/v4_tribe_mid.png' })
await page.evaluate((y) => window.scrollTo(0, y + 80), tribeY)
await page.waitForTimeout(900)
const card = page.locator('.tribe-card').nth(1)
await card.hover()
await page.waitForTimeout(800)
await page.screenshot({ path: '/tmp/stussy_qa/v4_tribe_hover.png' })

// store: slides + gold marquee
const storeY = await yOf('#store')
await page.evaluate((y) => window.scrollTo(0, y - 300), storeY)
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/stussy_qa/v4_store.png' })

// footer grad bar
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(1400)
await page.screenshot({ path: '/tmp/stussy_qa/v4_footer.png' })

console.log('CONSOLE ERRORS:', errors.length ? JSON.stringify(errors, null, 2) : 'none')
await browser.close()
console.log('DONE')
