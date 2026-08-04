import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(700)
await page.screenshot({ path: '/tmp/stussy_qa/lg_loader.png' })
await page.waitForTimeout(3400)
await page.screenshot({ path: '/tmp/stussy_qa/lg_hero.png' })

const yOf = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s)
  return el ? el.getBoundingClientRect().top + window.scrollY : 0
}, sel)

const storyY = await yOf('#story-pin')
await page.evaluate((y) => window.scrollTo(0, y - 350), storyY)
await page.waitForTimeout(1400)
await page.screenshot({ path: '/tmp/stussy_qa/lg_story.png' })

const tribeY = await yOf('#tribe')
await page.evaluate((y) => window.scrollTo(0, y - 500), tribeY)
await page.waitForTimeout(1200)
await page.screenshot({ path: '/tmp/stussy_qa/lg_tribe_head.png' })

await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(2000)
await page.screenshot({ path: '/tmp/stussy_qa/lg_footer.png' })

console.log('ERRORS:', errors.length ? errors : 'none')
await browser.close()
console.log('DONE')
