import { chromium } from 'playwright'

/* v6: chaotic typo verification + teleport hunt */

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()) })
page.on('pageerror', (err) => errors.push(String(err)))

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })

// document height stability: sample scrollHeight for 6s — must be constant
const heights = []
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(1000)
  heights.push(await page.evaluate(() => document.documentElement.scrollHeight))
}
console.log('HEIGHT SAMPLES:', heights.join(','), heights.every((h) => h === heights[0]) ? 'STABLE' : '*** SHIFTING ***')

await page.screenshot({ path: '/tmp/stussy_qa/v6_hero.png' })

const yOf = (sel) => page.evaluate((s) => {
  const el = document.querySelector(s)
  return el ? el.getBoundingClientRect().top + window.scrollY : 0
}, sel)

// story pin end → marquee → lookbook pin: tight-increment scroll, watch for jumps
const storyY = await yOf('#story-pin')
const lbY = await yOf('#lookbook-pin')
console.log('story pinY:', storyY, 'lb pinY:', lbY, 'gap:', lbY - storyY)

// walk from story pin end through lb pin start in 200px steps (like a user scrolling)
let prevTops = null
for (let y = storyY + 1500; y <= lbY + 400; y += 300) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y)
  await page.waitForTimeout(700)
  const state = await page.evaluate(() => {
    const mq = document.querySelectorAll('.c-marquee')[1]
    const lbPin = document.getElementById('lookbook-pin')
    const spacer = lbPin.parentElement
    return {
      scrollY: window.scrollY | 0,
      mqTop: mq ? mq.getBoundingClientRect().top | 0 : null,
      lbTop: lbPin.getBoundingClientRect().top | 0,
      lbParent: spacer?.className?.slice(0, 30),
    }
  })
  console.log(JSON.stringify(state))
}

await page.evaluate((y) => window.scrollTo(0, y - 700), lbY)
await page.waitForTimeout(900)
await page.screenshot({ path: '/tmp/stussy_qa/v6_boundary_before.png' })
await page.evaluate((y) => window.scrollTo(0, y + 60), lbY)
await page.waitForTimeout(900)
await page.screenshot({ path: '/tmp/stussy_qa/v6_boundary_after.png' })

console.log('CONSOLE ERRORS:', errors.length ? JSON.stringify(errors, null, 2) : 'none')
await browser.close()
console.log('DONE')
