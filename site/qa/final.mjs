import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })

// gyre arrow crop
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2800)
const gyre = page.locator('#story [data-gyre]').first()
await gyre.scrollIntoViewIfNeeded()
await page.waitForTimeout(900)
await page.locator('#story [data-gyre] .c-gyre__inner').first().hover()
await page.waitForTimeout(1400)
await gyre.screenshot({ path: '/tmp/stussy_qa/gyre_arrow_crop.png' })

// mobile pass
const mob = await browser.newPage({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true })
await mob.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await mob.waitForTimeout(2800)
await mob.screenshot({ path: '/tmp/stussy_qa/m_hero.png' })
await mob.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35))
await mob.waitForTimeout(1000)
await mob.screenshot({ path: '/tmp/stussy_qa/m_mid.png' })
await mob.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await mob.waitForTimeout(1000)
await mob.screenshot({ path: '/tmp/stussy_qa/m_footer.png' })

await browser.close()
console.log('DONE')
