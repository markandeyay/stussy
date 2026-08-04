import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

const info = await page.evaluate(() => {
  const card = document.querySelector('[data-product-card]')
  const inner = card?.querySelector('.c-gyre__inner')
  if (!inner) return 'NO INNER'
  const r = inner.getBoundingClientRect()
  const imgs = [...inner.querySelectorAll('img')].map((im) => {
    const cs = getComputedStyle(im)
    return {
      src: im.getAttribute('src'),
      natural: `${im.naturalWidth}x${im.naturalHeight}`,
      complete: im.complete,
      pos: cs.position,
      opacity: cs.opacity,
      transform: cs.transform.slice(0, 40),
      clip: cs.clipPath,
      zIndex: cs.zIndex,
      display: cs.display,
    }
  })
  return { innerRect: `${r.width.toFixed(0)}x${r.height.toFixed(0)}`, innerOverflow: getComputedStyle(inner).overflow, count: imgs.length, imgs }
})
console.log(JSON.stringify(info, null, 2))

// check story img clip state at approach scroll
const story = await page.evaluate(() => {
  const el = document.querySelector('[data-story-img]')
  const pin = document.getElementById('story-pin')
  const r = pin.getBoundingClientRect()
  return {
    pinTopVh: ((r.top + window.scrollY) | 0),
    clip: getComputedStyle(el).clipPath,
    rotate: getComputedStyle(el).transform.slice(0, 60),
    scrollY: window.scrollY,
  }
})
console.log('STORY AT TOP:', JSON.stringify(story, null, 2))
await browser.close()
