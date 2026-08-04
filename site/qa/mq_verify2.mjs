import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4000)

const parity = await page.evaluate(() =>
  [...document.querySelectorAll('[data-marquee]')].map((mq) => ({
    type: mq.dataset.type,
    singles: mq.querySelector('.marquee-set').children.length,
  }))
)

const probe = async (idx) => {
  await page.evaluate((i) => {
    const mq = [...document.querySelectorAll('[data-marquee]')][i]
    const r = mq.getBoundingClientRect()
    window.scrollTo(0, window.scrollY + r.top - window.innerHeight / 2 + r.height / 2)
  }, idx)
  await page.waitForTimeout(800)

  await page.evaluate((i) => {
    const set = [...document.querySelectorAll('[data-marquee]')][i].querySelector('.marquee-set')
    window.__rec = []
    const tick = () => {
      window.__rec.push(+set.getBoundingClientRect().left.toFixed(1))
      if (window.__rec.length < 200) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, idx)

  await page.mouse.move(720, 200)
  for (let i = 0; i < 16; i++) {
    await page.mouse.wheel(0, 240)
    await page.waitForTimeout(70)
  }
  await page.waitForTimeout(600)

  const rec = await page.evaluate(() => window.__rec)
  const dx = rec.slice(1).map((x, i) => +(x - rec[i]).toFixed(1))
  // backward jumps = positive deltas beyond the loop-wrap magnitude tolerance
  const wrap = await page.evaluate((i) => {
    const set = [...document.querySelectorAll('[data-marquee]')][i].querySelector('.marquee-set')
    return set.scrollWidth / 2
  }, idx)
  const backwards = dx.filter((d) => d > 5 && d < wrap * 0.9)
  const wraps = dx.filter((d) => d >= wrap * 0.9)
  return { frames: rec.length, maxSpeed: Math.min(...dx), backwardJumps: backwards, seamlessWraps: wraps.length }
}

const r = [await probe(0), await probe(1), await probe(2)]
console.log(JSON.stringify({ parity, carolina: r[0], navy: r[1], gold: r[2] }, null, 1))

// visual burst on navy for the eyeball check
await page.evaluate(() => {
  const mq = [...document.querySelectorAll('[data-marquee]')][1]
  const rr = mq.getBoundingClientRect()
  window.scrollTo(0, window.scrollY + rr.top - window.innerHeight / 2 + rr.height / 2)
})
await page.waitForTimeout(700)
const clip = await page.evaluate(() => {
  const mq = [...document.querySelectorAll('[data-marquee]')][1]
  const rr = mq.getBoundingClientRect()
  return { x: 0, y: Math.max(0, rr.top), width: 1440, height: rr.height }
})
await page.mouse.move(720, 200)
const scroll = (async () => {
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 140); await page.waitForTimeout(16) }
})()
for (let i = 0; i < 8; i++) {
  await page.screenshot({ path: `qa/shots/mv-${i}.png`, clip })
  await page.waitForTimeout(40)
}
await scroll
await browser.close()
