import { chromium } from 'playwright'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)

const lb = await page.evaluate(() => {
  const track = document.getElementById('lookbook-track')
  const kids = [...track.children].map((k) => {
    const r = k.getBoundingClientRect()
    return `${k.className.slice(0, 18)} w:${r.width | 0}`
  })
  return { scrollWidth: track.scrollWidth, vw: innerWidth, dist: track.scrollWidth - innerWidth + 40, kids }
})
console.log('LB:', JSON.stringify(lb, null, 1))

const foot = await page.evaluate(() => {
  const meta = document.querySelector('.p-footer__meta, .p-footer__bottom, footer small, footer p')
  const f = document.querySelector('.p-footer')
  const els = [...f.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.textContent.trim()).slice(-8)
  return els.map((e) => {
    const r = e.getBoundingClientRect()
    const cs = getComputedStyle(e)
    return `"${e.textContent.trim().slice(0, 34)}" cls:${e.className.slice(0, 30)} top:${r.top | 0} pos:${cs.position}`
  })
})
console.log('FOOT:', JSON.stringify(foot, null, 1))
await browser.close()
