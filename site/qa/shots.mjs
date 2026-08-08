import { chromium } from 'playwright'
import fs from 'node:fs'

const URL = process.env.URL || 'http://localhost:5173/Stussy/'
const OUT = process.env.OUT || './qa/out/shots'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1512, height: 900 }, deviceScaleFactor: 1 })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(URL, { waitUntil: 'load' })
await page.waitForTimeout(4000)

const H = await page.evaluate(() => document.documentElement.scrollHeight)
console.log('docHeight', H, 'vh', 900)

const stops = []
for (let y = 0; y < H - 900; y += 700) stops.push(y)
stops.push(H - 900)

let i = 0
for (const y of stops) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y)
  await page.waitForTimeout(650)
  await page.screenshot({ path: `${OUT}/${String(i).padStart(2, '0')}_y${y}.png` })
  i++
}
console.log('shots', i, 'errors', JSON.stringify(errors.slice(0, 8)))
await browser.close()
