import { chromium } from 'playwright'

/* full-page error sweep: screenshot every region, look for breakage */

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3400)
await page.screenshot({ path: '/tmp/stussy_qa/sw_00_hero.png' })

const yOf = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s)
  return el ? el.getBoundingClientRect().top + window.scrollY : 0
}, sel)

const stops = [
  ['mq1', '.c-marquee[data-type="navy"]', -500],
  ['story_pre', '#story-pin', -620],
  ['story_pin_a', '#story-pin', 200],
  ['story_pin_b', '#story-pin', 700],
  ['story_pin_c', '#story-pin', 1200],
  ['story_pin_d', '#story-pin', 1750],
  ['lb_a', '#lookbook-pin', 100],
  ['lb_b', '#lookbook-pin', 1500],
  ['lb_c', '#lookbook-pin', 3200],
  ['drop_a', '#drop', -350],
  ['drop_b', '#drop', -30],
  ['drop_c', '#drop', 500],
  ['tribe_a', '#tribe', -380],
  ['tribe_b', '#tribe', 60],
  ['store_a', '#store', -320],
  ['store_b', '#store', 120],
  ['footer', '.p-footer', -250],
]
for (const [name, sel, off] of stops) {
  const y = await yOf(sel)
  await page.evaluate((yy) => window.scrollTo(0, yy), y + off)
  await page.waitForTimeout(850)
  await page.screenshot({ path: `/tmp/stussy_qa/sw_${name}.png` })
}

// back to top — check state restoration
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(1200)
await page.screenshot({ path: '/tmp/stussy_qa/sw_return_top.png' })

console.log('CONSOLE ERRORS:', errors.length ? JSON.stringify(errors, null, 2) : 'none')
await browser.close()
console.log('DONE')
