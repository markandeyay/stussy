import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

// scroll so marquee 1 is mid-viewport, then spike velocity past it
await page.evaluate(() => window.scrollTo(0, 500))
await page.waitForTimeout(800)

// sample set transform + playbackRate during a fast wheel burst
const samples = await page.evaluate(async () => {
  const set = document.querySelector('.c-marquee .marquee-set')
  const out = []
  const read = () => {
    const m = new DOMMatrixReadOnly(getComputedStyle(set).transform)
    out.push({ x: +m.m41.toFixed(1), rate: set.getAnimations()[0]?.playbackRate ?? null })
  }
  const burst = () => {
    window.scrollBy(0, 140)
    if (Math.random() > 0.5) window.scrollBy(0, 90)
  }
  for (let i = 0; i < 30; i++) {
    burst()
    read()
    await new Promise((r) => setTimeout(r, 40))
  }
  return out
})

// continuity: position deltas between consecutive samples should never
// reverse sign wildly (twitch = huge positive spikes amid steady negative)
const deltas = samples.slice(1).map((s, i) => +(s.x - samples[i].x).toFixed(1))
const jumps = deltas.filter((d) => d > 40).length
const rates = [...new Set(samples.map((s) => s.rate))]

// gap check: park marquee 1 at its drift extreme (entering viewport) and shoot
await page.evaluate(() => {
  const mq = document.querySelector('.c-marquee')
  const r = mq.getBoundingClientRect()
  window.scrollTo(0, window.scrollY + r.top - window.innerHeight + r.height * 0.5)
})
await page.waitForTimeout(1400) // let scrub settle at extreme
await page.screenshot({ path: 'qa/shots/mq-gap-check.png' })

// measure solid band coverage across the viewport width
const gap = await page.evaluate(() => {
  const mq = document.querySelector('.c-marquee')
  const r = mq.getBoundingClientRect()
  const y = r.top + r.height / 2
  const right = document.elementFromPoint(window.innerWidth - 2, y)
  const left = document.elementFromPoint(2, y)
  return {
    bandTop: +r.top.toFixed(0),
    rightEdgeHit: right ? right.closest('.c-marquee') ? 'band' : right.tagName : 'none',
    leftEdgeHit: left ? left.closest('.c-marquee') ? 'band' : left.tagName : 'none',
    innerX: new DOMMatrixReadOnly(getComputedStyle(mq.querySelector('.c-marquee__inner')).transform).m41,
  }
})

console.log(JSON.stringify({ rates, jumps, deltas: deltas.slice(0, 18), gap }, null, 1))
await browser.close()
