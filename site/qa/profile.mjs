import { chromium } from 'playwright'

/* baseline/verification profiler: idle FPS, scroll FPS, longtasks */

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

// inject FPS + longtask meters
await page.evaluate(() => {
  window.__meters = { frames: 0, longtasks: 0, worst: 0 }
  const loop = () => { window.__meters.frames++; requestAnimationFrame(loop) }
  requestAnimationFrame(loop)
  new PerformanceObserver((list) => {
    list.getEntries().forEach((e) => {
      window.__meters.longtasks++
      if (e.duration > window.__meters.worst) window.__meters.worst = e.duration
    })
  }).observe({ entryTypes: ['longtask'] })
})

const snap = () => page.evaluate(() => {
  const m = { ...window.__meters }
  window.__meters.frames = 0; window.__meters.longtasks = 0; window.__meters.worst = 0
  return m
})

// idle 4s at hero
await page.waitForTimeout(4000)
const idle = await snap()

// heavy scroll: wheel down fast through the whole page, then back up
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(500)
await snap()
for (let i = 0; i < 60; i++) {
  await page.mouse.wheel(0, 220)
  await page.waitForTimeout(28)
}
const scrollDown = await snap()
for (let i = 0; i < 60; i++) {
  await page.mouse.wheel(0, -260)
  await page.waitForTimeout(28)
}
const scrollUp = await snap()

// canvas frame cost: time one manual step of the typo loop via rAF measure
const canvasCost = await page.evaluate(() => {
  return new Promise((res) => {
    const t0 = performance.now()
    let n = 0
    const check = () => { if (++n === 120) res(((performance.now() - t0) / 120).toFixed(2)); else requestAnimationFrame(check) }
    requestAnimationFrame(check)
  })
})

console.log(JSON.stringify({
  idle_fps: (idle.frames / 4).toFixed(1),
  idle_longtasks: idle.longtasks,
  scroll_down: { fps: (scrollDown.frames / (60 * 28 / 1000)).toFixed(1), longtasks: scrollDown.longtasks, worst_ms: scrollDown.worst.toFixed(0) },
  scroll_up: { fps: (scrollUp.frames / (60 * 28 / 1000)).toFixed(1), longtasks: scrollUp.longtasks, worst_ms: scrollUp.worst.toFixed(0) },
  raf_frame_ms_at_rest: canvasCost,
}, null, 1))
await browser.close()
