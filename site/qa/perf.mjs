import { chromium } from 'playwright'

/* Frame + main-thread cost probe.
   Scrolls the page on a fixed schedule and samples:
   - rAF frame intervals (jank = frames > 20ms)
   - long tasks (PerformanceObserver 'longtask')
   - style/layout/paint totals from the CDP performance domain */

const URL = process.env.URL || 'http://localhost:5173/Stussy/'
const LABEL = process.env.LABEL || 'run'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1512, height: 900 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(String(e)))

await page.addInitScript(() => {
  window.__frames = []
  window.__long = []
  let last = performance.now()
  const tick = () => {
    const now = performance.now()
    window.__frames.push(now - last)
    last = now
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__long.push(e.duration)
    }).observe({ entryTypes: ['longtask'] })
  } catch { /* not supported */ }
})

await page.goto(URL, { waitUntil: 'load' })
await page.waitForTimeout(4500)

const cdp = await page.context().newCDPSession(page)
await cdp.send('Performance.enable')
/* throttle so the numbers reflect a mid-range machine, not an M-series Mac —
   unthrottled, almost any amount of per-frame work fits in the budget */
const THROTTLE = Number(process.env.THROTTLE || 6)
if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE })
const before = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]))

await page.evaluate(() => { window.__frames.length = 0; window.__long.length = 0 })

// steady scroll sweep: 60 steps over the document
const H = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
for (let i = 0; i <= 60; i++) {
  await page.mouse.wheel(0, H / 60)
  await page.waitForTimeout(90)
}
await page.waitForTimeout(800)

const after = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]))
const { frames, long } = await page.evaluate(() => ({ frames: window.__frames, long: window.__long }))

const sorted = [...frames].sort((a, b) => a - b)
const pct = (p) => sorted[Math.floor(sorted.length * p)]?.toFixed(2)
const jank = frames.filter((f) => f > 20).length
const d = (k) => ((after[k] || 0) - (before[k] || 0)).toFixed(3)

const nodes = await page.evaluate(() => document.querySelectorAll('*').length)

console.log(JSON.stringify({
  label: LABEL,
  frames: frames.length,
  medianFrameMs: +pct(0.5),
  p95FrameMs: +pct(0.95),
  p99FrameMs: +pct(0.99),
  jankFrames: jank,
  jankPct: +((jank / frames.length) * 100).toFixed(1),
  longTasks: long.length,
  longTaskMsTotal: +long.reduce((a, b) => a + b, 0).toFixed(1),
  scriptSec: +d('ScriptDuration'),
  layoutSec: +d('LayoutDuration'),
  recalcStyleSec: +d('RecalcStyleDuration'),
  domNodes: nodes,
  errors: errors.slice(0, 5),
}, null, 2))

await browser.close()
