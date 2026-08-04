import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

const trace = async (idx, label) => {
  // park the marquee mid-viewport
  await page.evaluate((i) => {
    const mq = [...document.querySelectorAll('[data-marquee]')][i]
    const r = mq.getBoundingClientRect()
    window.scrollTo(0, window.scrollY + r.top - window.innerHeight / 2)
  }, idx)
  await page.waitForTimeout(700)

  return page.evaluate(async (i) => {
    const set = [...document.querySelectorAll('[data-marquee]')][i].querySelector('.marquee-set')
    const rows = []
    let last = performance.now()
    let dir = 1
    let y = window.scrollY
    const y0 = y
    return new Promise((res) => {
      const tick = () => {
        const now = performance.now()
        const gap = now - last
        last = now
        const m = new DOMMatrixReadOnly(getComputedStyle(set).transform)
        rows.push({ gap: +gap.toFixed(1), x: +m.m41.toFixed(1), rate: set.getAnimations()[0]?.playbackRate ?? 0 })
        // keep scrolling like a user: bounce up/down within the zone
        y += dir * 26
        if (y > y0 + 500) dir = -1
        if (y < y0 - 500) dir = 1
        window.scrollTo(0, y)
        if (rows.length < 90) requestAnimationFrame(tick)
        else res(rows)
      }
      requestAnimationFrame(tick)
    })
  }, idx)
}

const summarize = (rows, label) => {
  const dx = rows.slice(1).map((r, i) => +(r.x - rows[i].x).toFixed(1))
  const gaps = rows.map((r) => r.gap)
  const dropped = gaps.filter((g) => g > 20).length // >20ms at 120Hz = dropped frames
  // stutter metric: normalized delta variance (ignoring the loop wrap)
  const fwd = dx.filter((d) => d < 100)
  const mean = fwd.reduce((a, b) => a + b, 0) / fwd.length
  const variance = fwd.reduce((a, b) => a + (b - mean) ** 2, 0) / fwd.length
  return {
    label,
    frames: rows.length,
    droppedFrames: dropped,
    avgGap: +(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1),
    maxGap: +Math.max(...gaps).toFixed(1),
    meanSpeed: +mean.toFixed(1),
    deltaStdDev: +Math.sqrt(variance).toFixed(1),
    sampleDeltas: dx.slice(10, 26),
  }
}

const t1 = await trace(0, 'carolina (1st)')
const t2 = await trace(1, 'navy (2nd)')
const t3 = await trace(2, 'gold (3rd)')
console.log(JSON.stringify([summarize(t1), summarize(t2), summarize(t3)], null, 1))
await browser.close()
