import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

// park navy marquee center, real wheel scroll slowly enough to keep it in view
await page.evaluate(() => {
  const mq = [...document.querySelectorAll('[data-marquee]')][1]
  const r = mq.getBoundingClientRect()
  window.scrollTo(0, window.scrollY + r.top - window.innerHeight / 2 + r.height / 2)
})
await page.waitForTimeout(800)

const clip = await page.evaluate(() => {
  const mq = [...document.querySelectorAll('[data-marquee]')][1]
  const r = mq.getBoundingClientRect()
  return { x: 0, y: Math.max(0, r.top), width: 1440, height: r.height }
})

await page.mouse.move(720, 200)
// keep velocity flowing while shooting as fast as possible
const scrolling = (async () => {
  for (let i = 0; i < 60; i++) {
    await page.mouse.wheel(0, 120)
    await page.waitForTimeout(16)
  }
})()
for (let i = 0; i < 20; i++) {
  await page.screenshot({ path: `qa/shots/mb-${String(i).padStart(2, '0')}.png`, clip })
  await page.waitForTimeout(30)
}
await scrolling
await browser.close()
