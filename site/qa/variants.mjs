import { chromium, devices } from 'playwright'
import fs from 'node:fs'

const URL = process.env.URL || 'http://localhost:5173/Stussy/'
const OUT = process.env.OUT || './qa/out/variants'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })

const runs = [
  { name: 'mobile', ctx: { ...devices['iPhone 13'] }, steps: 9 },
  { name: 'reduced', ctx: { viewport: { width: 1512, height: 900 }, reducedMotion: 'reduce' }, steps: 8 },
  { name: 'tablet', ctx: { viewport: { width: 900, height: 1000 } }, steps: 7 },
]

for (const run of runs) {
  const ctx = await browser.newContext(run.ctx)
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto(URL, { waitUntil: 'load' })
  await page.waitForTimeout(4000)

  const vh = page.viewportSize().height
  const H = await page.evaluate(() => document.documentElement.scrollHeight)
  const span = Math.max(1, H - vh)

  for (let i = 0; i < run.steps; i++) {
    const y = Math.round((span * i) / (run.steps - 1))
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT}/${run.name}-${String(i).padStart(2, '0')}.png` })
  }

  /* invisible-content audit: anything a failed reveal could have stranded */
  const stranded = await page.evaluate(() => {
    const bad = []
    document.querySelectorAll('[data-reveal], [data-reveal-head], .gl, .wd, [data-product], [data-tribe], [data-store], [data-ln], [data-body], [data-fact]').forEach((el) => {
      const cs = getComputedStyle(el)
      if (parseFloat(cs.opacity) < 0.05 && el.getBoundingClientRect().height > 0) {
        bad.push((el.className || el.tagName) + '')
      }
    })
    return [...new Set(bad)].slice(0, 10)
  })

  console.log(run.name, '| docH', H, '| errors', JSON.stringify(errors.slice(0, 4)), '| stranded', JSON.stringify(stranded))
  await ctx.close()
}

await browser.close()
