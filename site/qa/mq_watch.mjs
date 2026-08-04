import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

await page.evaluate(() => {
  window.__lt = []
  new PerformanceObserver((l) => {
    l.getEntries().forEach((e) => window.__lt.push(+e.duration.toFixed(0)))
  }).observe({ entryTypes: ['longtask'] })
})

// park marquee 2 (navy) mid-viewport
await page.evaluate(() => {
  const mqs = [...document.querySelectorAll('[data-marquee]')]
  const mq = mqs[1]
  const r = mq.getBoundingClientRect()
  window.scrollTo(0, window.scrollY + r.top - window.innerHeight / 2 + r.height / 2)
})
await page.waitForTimeout(900)

const clip = await page.evaluate(() => {
  const mq = [...document.querySelectorAll('[data-marquee]')][1]
  const r = mq.getBoundingClientRect()
  return { x: 0, y: Math.max(0, r.top), width: 1440, height: Math.min(r.height, 200) }
})

// burst-scroll continuously while snapping frames of the band
const scroll = page.evaluate(async () => {
  for (let i = 0; i < 40; i++) {
    window.scrollBy(0, 60)
    await new Promise((r) => setTimeout(r, 25))
  }
})
for (let i = 0; i < 14; i++) {
  await page.screenshot({ path: `qa/shots/mqw-${String(i).padStart(2, '0')}.png`, clip })
  await page.waitForTimeout(70)
}
await scroll

// also sample transform deltas of BOTH set and inner for marquee 2
const stats = await page.evaluate(() => {
  const lt = window.__lt
  return { longtasks: lt.length, worst: lt.slice().sort((a, b) => b - a).slice(0, 5) }
})
console.log(JSON.stringify(stats))
await browser.close()
