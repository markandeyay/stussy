import { chromium } from 'playwright'

/* Hover + interaction QA: gyre spin, tribe invert, nav wipe, console errors */

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2800)

// hero post-loader
await page.screenshot({ path: '/tmp/stussy_qa/hero_v2.png' })

// gyre hover (story porch image)
const gyre = page.locator('#story [data-gyre] .c-gyre__inner').first()
await gyre.scrollIntoViewIfNeeded()
await page.waitForTimeout(900)
await gyre.hover()
await page.waitForTimeout(1200)
await page.locator('#story').screenshot({ path: '/tmp/stussy_qa/hover_gyre.png' })

// tribe hover invert
const card = page.locator('.tribe-card').nth(1)
await card.scrollIntoViewIfNeeded()
await page.waitForTimeout(800)
await card.hover()
await page.waitForTimeout(700)
await page.locator('#tribe').screenshot({ path: '/tmp/stussy_qa/hover_tribe.png' })

// nav click -> transition wipe (catch mid-wipe)
await page.locator('.p-header__nav a[href="#drop"]').click()
await page.waitForTimeout(450)
await page.screenshot({ path: '/tmp/stussy_qa/wipe_mid.png' })
await page.waitForTimeout(1400)
await page.screenshot({ path: '/tmp/stussy_qa/wipe_after.png' })

console.log('CONSOLE ERRORS:', errors.length ? JSON.stringify(errors, null, 2) : 'none')
await browser.close()
console.log('DONE')
