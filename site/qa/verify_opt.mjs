import { chromium } from 'playwright'

/* post-optimization visual verification: every touched behavior */

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4200)
const shot = (n) => page.screenshot({ path: `qa/shots/opt-${n}.png` })

await shot('01-hero')

// lookbook mid-pin: bar fill + counter must show mid state
const lbStart = await page.evaluate(() => {
  const st = window.__ST.getAll().find((t) => t.trigger && t.trigger.id === 'lookbook-pin')
  return st ? st.start + (st.end - st.start) * 0.5 : 0
})
await page.evaluate((y) => window.scrollTo(0, y), lbStart)
await page.waitForTimeout(900)
await shot('02-lookbook-mid')
const lbState = await page.evaluate(() => ({
  count: document.getElementById('lb-count')?.textContent,
  barTransform: document.getElementById('lb-bar-fill')?.style.transform,
}))

// story fully revealed + -anim-done applied (letters released)
await page.evaluate(() => {
  const st = window.__ST.getAll().find((t) => t.trigger && t.trigger.id === 'story-pin')
  window.scrollTo(0, st ? st.end + 20 : 0)
})
await page.waitForTimeout(2500)
const animDone = await page.evaluate(() => ({
  doneHeads: document.querySelectorAll('.-anim-done').length,
  liveGyres: document.querySelectorAll('.c-gyre__inner.-live').length,
}))
await shot('03-after-story')

// gyre hover mid-flight (will-change live) then rest
const gyre = page.locator('.product .c-gyre__inner').first()
await gyre.hover()
await page.waitForTimeout(350)
await shot('04-gyre-hover')
const hoverLive = await page.evaluate(() => document.querySelectorAll('.c-gyre__inner.-live').length)
await page.mouse.move(700, 300)
await page.waitForTimeout(1000)
const restLive = await page.evaluate(() => document.querySelectorAll('.c-gyre__inner.-live').length)

// footer word + pagetop
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(2200)
await shot('05-footer')

// nav wipe transition still works
await page.click('.sec-nav a[href="#lookbook"]').catch(() => {})
await page.waitForTimeout(420)
await shot('06-transition-mid')
await page.waitForTimeout(1500)
await shot('07-after-wipe')

console.log(JSON.stringify({ lbState, animDone, hoverLive, restLive }))
await browser.close()
