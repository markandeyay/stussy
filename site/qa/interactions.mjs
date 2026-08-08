import { chromium } from 'playwright'
import fs from 'node:fs'

const URL = process.env.URL || 'http://localhost:5173/Stussy/'
const OUT = process.env.OUT || './qa/out/interactions'
fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

// ── loader states
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(700)
await page.screenshot({ path: `${OUT}/01-loader.png` })
await page.waitForTimeout(1600)
await page.screenshot({ path: `${OUT}/02-loader-late.png` })
await page.waitForTimeout(3000)
await page.screenshot({ path: `${OUT}/03-hero-settled.png` })

const shot = async (name) => page.screenshot({ path: `${OUT}/${name}.png` })

// ── media hover (story photo) + cursor
await page.evaluate(() => window.scrollTo(0, 1450))
await page.waitForTimeout(900)
const frame = await page.$('.story__media .media__frame')
const box = await frame.boundingBox()
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
await page.waitForTimeout(900)
await shot('04-media-hover')

// ── tribe card hover
await page.evaluate(() => document.getElementById('tribe').scrollIntoView())
await page.waitForTimeout(1200)
const card = await page.$('.tribe-card')
const cb = await card.boundingBox()
await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2)
await page.waitForTimeout(900)
await shot('05-tribe-hover')

// ── curtain transition mid-wipe
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(900)
await page.click('a[href="#drop"]', { force: true })
await page.waitForTimeout(320)
await shot('06-curtain')
await page.waitForTimeout(1400)
await shot('07-after-curtain')

// ── keyboard focus ring
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(600)
await page.keyboard.press('Tab')
await page.keyboard.press('Tab')
await page.keyboard.press('Tab')
await shot('08-focus')

console.log('errors', JSON.stringify(errors.slice(0, 6)))
await browser.close()
