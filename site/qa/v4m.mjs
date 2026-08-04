import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
const errors = []
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

const yOf = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s)
  return el ? el.getBoundingClientRect().top + window.scrollY : 0
}, sel)

const storyY = await yOf('#story-pin')
await page.evaluate((y) => window.scrollTo(0, y - 100), storyY)
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/stussy_qa/v4m_story.png' })

const dropY = await yOf('#drop')
await page.evaluate((y) => window.scrollTo(0, y - 60), dropY)
await page.waitForTimeout(1000)
await page.screenshot({ path: '/tmp/stussy_qa/v4m_drop.png' })

console.log('ERRORS:', errors.length ? errors : 'none')
await browser.close()
console.log('DONE')
