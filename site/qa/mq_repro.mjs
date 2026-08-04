import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

const probe = async (idx) => {
  // park marquee idx just below center so wheel scrolling passes it through view
  await page.evaluate((i) => {
    const mq = [...document.querySelectorAll('[data-marquee]')][i]
    const r = mq.getBoundingClientRect()
    window.scrollTo(0, window.scrollY + r.top - window.innerHeight * 0.7)
  }, idx)
  await page.waitForTimeout(800)

  // start rAF recorder
  await page.evaluate((i) => {
    const mq = [...document.querySelectorAll('[data-marquee]')][i]
    const set = mq.querySelector('.marquee-set')
    const inner = mq.querySelector('.c-marquee__inner')
    window.__rec = []
    let last = performance.now()
    const tick = () => {
      const now = performance.now()
      const sx = new DOMMatrixReadOnly(getComputedStyle(set).transform).m41
      const ix = new DOMMatrixReadOnly(getComputedStyle(inner).transform).m41
      window.__rec.push({
        dt: +(now - last).toFixed(1),
        sx: +sx.toFixed(1),
        ix: +ix.toFixed(1),
        rate: +(set.getAnimations()[0]?.playbackRate ?? 0).toFixed(2),
        y: +window.scrollY.toFixed(0),
      })
      last = now
      if (window.__rec.length < 240) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, idx)

  // real mouse wheel bursts through the marquee
  await page.mouse.move(720, 450)
  for (let i = 0; i < 14; i++) {
    await page.mouse.wheel(0, 240)
    await page.waitForTimeout(90)
  }
  await page.waitForTimeout(1200)

  const rec = await page.evaluate(() => window.__rec)
  const dx = rec.slice(1).map((r, i) => +(r.sx - rec[i].sx).toFixed(1))
  const rates = [...new Set(rec.map((r) => r.rate))].sort((a, b) => a - b)
  const dts = rec.map((r) => r.dt)
  return {
    frames: rec.length,
    rateMin: rates[0],
    rateMax: rates[rates.length - 1],
    dtMax: Math.max(...dts),
    // the stutter signature: frame-to-frame delta flips or collapses (excluding wrap)
    deltas: dx.slice(40, 90),
    innerDrift: rec.slice(40, 52).map((r) => r.ix),
  }
}

const r1 = await probe(0)
const r2 = await probe(1)
const r3 = await probe(2)
console.log(JSON.stringify({ carolina: r1, navy: r2, gold: r3 }, null, 1))
await browser.close()
