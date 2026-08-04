import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2800)

const y = await page.evaluate(() => {
  const el = document.getElementById('drop')
  return el.getBoundingClientRect().top + window.scrollY
})
await page.evaluate((yy) => window.scrollTo(0, yy), y + 50)
await page.waitForTimeout(3500)

const info = await page.evaluate(() => {
  const card = document.querySelector('[data-product-card]')
  const inner = card?.querySelector('.c-gyre__inner')
  const imgs = [...inner.querySelectorAll('img')].map((im) => ({
    complete: im.complete,
    natural: im.naturalWidth,
    loading: im.loading,
    rect: (() => { const r = im.getBoundingClientRect(); return `${r.width | 0}x${r.height | 0}@${r.top | 0},${r.left | 0}` })(),
    vis: getComputedStyle(im).visibility,
  }))
  const cardCS = getComputedStyle(card)
  return { cardOpacity: cardCS.opacity, cardTransform: cardCS.transform.slice(0, 50), imgs }
})
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: '/tmp/stussy_qa/probe_drop.png' })
await browser.close()
console.log('DONE')
